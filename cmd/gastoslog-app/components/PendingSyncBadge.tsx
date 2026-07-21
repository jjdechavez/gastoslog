import { Pressable, StyleSheet, View } from "react-native";
import {
  useIsMutating,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";
import { EXPENSE_CREATE_MUTATION_KEY } from "@/services/offline/mutation-keys";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

// A single status pill: an icon + label on a tinted rounded background,
// optionally pressable (used for the dismissable "failed" state).
function StatusPill({
  icon,
  iconColor,
  background,
  textColor,
  label,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  background: string;
  textColor: string;
  label: string;
  onPress?: () => void;
}) {
  const content = (
    <ThemedView style={[styles.pill, { backgroundColor: background }]}>
      <IconSymbol name={icon} size={14} color={iconColor} />
      <ThemedText type="small" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </ThemedView>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

type PendingSyncBadgeProps = {
  // Which offline-write mutation to report on. Defaults to the expense-create
  // key so the existing usage on the expense tab (`<PendingSyncBadge />`,
  // no props) keeps behaving exactly as before.
  mutationKey?: readonly unknown[];
  // Singular/plural noun for the pending/failed item count, e.g.
  // "expense"/"expenses" or "category"/"categories".
  nounSingular?: string;
  nounPlural?: string;
};

// Shows the offline-write outbox status for a given create mutation (keyed
// by `mutationKey`):
//  • how many writes are queued/in-flight (syncing when online, waiting when
//    offline), and
//  • how many permanently failed (retries exhausted), which the user can tap
//    to dismiss.
// Renders nothing when there's nothing pending or failed.
export function PendingSyncBadge({
  mutationKey = EXPENSE_CREATE_MUTATION_KEY,
  nounSingular = "expense",
  nounPlural = "expenses",
}: PendingSyncBadgeProps) {
  const queryClient = useQueryClient();
  const pendingCount = useIsMutating({ mutationKey });
  const isOnline = useOnlineStatus();

  // Reactively read the underlying Mutation objects (not just their state)
  // for any mutation matching this key that exhausted its retries, so they
  // can be individually removed from the cache when the user taps to
  // dismiss.
  const failedMutations = useMutationState({
    filters: { mutationKey, status: "error" },
    select: (mutation) => mutation,
  });

  const dismissFailed = () => {
    const cache = queryClient.getMutationCache();
    failedMutations.forEach((mutation) => cache.remove(mutation));
  };

  if (pendingCount === 0 && failedMutations.length === 0) {
    return null;
  }

  const noun = (count: number) => (count === 1 ? nounSingular : nounPlural);

  return (
    <View style={styles.container}>
      {pendingCount > 0 ? (
        <StatusPill
          icon={isOnline ? "arrow.triangle.2.circlepath" : "clock"}
          iconColor={PicoColors["lime-500"]}
          background={PicoColors["lime-50"]}
          textColor={PicoColors["lime-800"]}
          label={
            isOnline
              ? `Syncing ${pendingCount} ${noun(pendingCount)}…`
              : `${pendingCount} ${noun(pendingCount)} waiting to sync`
          }
        />
      ) : null}

      {failedMutations.length > 0 ? (
        <StatusPill
          icon="exclamationmark.triangle.fill"
          iconColor={PicoColors["red-500"]}
          background={PicoColors["red-50"]}
          textColor={PicoColors["red-800"]}
          label={`${failedMutations.length} failed to sync — tap to dismiss`}
          onPress={dismissFailed}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
