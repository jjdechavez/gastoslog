import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useTarget, useTargetLogs } from "@/services/api-hook/target";
import { toFormattedDate } from "@/services/string";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { TargetLog } from "@/types/target";
import { Card, CardBody } from "@/components/Card";
import { Button, ButtonText } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Row } from "@/components/Row";
import { IconCircle } from "@/components/IconCircle";
import { ListRow } from "@/components/ListRow";
import { Amount } from "@/components/Amount";
import { ProgressRing } from "@/components/ProgressRing";
import { PendingTag } from "@/components/PendingTag";
import { EmptyState, ListFooterLoader, LoadingState, ErrorState } from "@/components/ScreenState";

function TargetDetailHeader({ targetId }: { targetId: string }) {
  const targetQuery = useTarget(targetId);

  if (targetQuery.isPending) {
    return <LoadingState message="Loading target..." />;
  }

  if (targetQuery.isError) {
    return <ErrorState message="Error loading target" />;
  }

  const target = targetQuery.data.data;

  const currentAmount = target.paidAmount;
  const progress =
    target.targetAmount > 0
      ? Math.min((currentAmount / target.targetAmount) * 100, 100)
      : 0;

  return (
    <ThemedView>
      <Row>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {target.name}
        </ThemedText>
      </Row>

      <View style={styles.progressRingWrapper}>
        <ProgressRing value={progress}>
          <ThemedText type="caption" style={{ letterSpacing: 0.6 }}>
            PAID
          </ThemedText>
          <ThemedText style={styles.progressValue} type="defaultSemiBold">
            {progress.toFixed(0)}%
          </ThemedText>
        </ProgressRing>

        <View style={styles.amountSummary}>
          <Amount
            cents={currentAmount}
            type="subtitle"
            style={styles.amountPaid}
          />
          <ThemedText type="caption" style={styles.amountTargetLabel}>
            of <Amount cents={target.targetAmount} type="caption" /> target
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

function TargetLogItem({ log, targetId }: { log: TargetLog; targetId: string }) {
  const router = useRouter();
  // A log added while offline is rendered with a negative temp id (see
  // services/offline/mutation-defaults.ts) until the create mutation
  // resolves and the logs list is invalidated/refetched with the real
  // server id. Guard the same way ExpenseItem/CategoryItem do — there's no
  // server record yet, so don't navigate to the edit screen for it.
  const isOptimistic = log.id < 0;

  return (
    <Pressable
      onPress={
        isOptimistic
          ? undefined
          : () => router.push(`/(auth)/target/${targetId}/log/${log.id}/edit`)
      }
    >
      <Card>
        <CardBody>
          <ListRow
            title={log.notes || "Target Payment"}
            subtitle={toFormattedDate(log.entryDate.toString())}
            right={
              isOptimistic ? (
                <View style={styles.pendingRight}>
                  <Amount cents={log.amount} sign="+" tone="muted" />
                  <PendingTag />
                </View>
              ) : (
                <Amount cents={log.amount} sign="+" tone="primary" style={{ fontWeight: "600" }} />
              )
            }
          />
        </CardBody>
      </Card>
    </Pressable>
  );
}

export default function TargetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetId = params.targetId as string;

  // A target created while offline is rendered with a negative temp id
  // (see services/offline/mutation-defaults.ts) until the create mutation
  // resolves and the target list is invalidated/refetched with the real
  // server id. There's nothing to fetch yet for a temp id — /targets/-123
  // and /targets/-123/logs don't exist on the server — so skip both queries
  // and show an explanatory empty state instead. This also naturally blocks
  // reaching the add-progress screen (log.tsx) for an unsynced target, since
  // that's only linked from here.
  const isTempTarget = Number(targetId) < 0;

  const targetQuery = useTarget(targetId, { enabled: !isTempTarget });
  const logsQuery = useTargetLogs(targetId, { enabled: !isTempTarget });

  const status = targetQuery.data?.data.status;
  const canLogPayment = status !== "completed" && status !== "cancelled";

  if (isTempTarget) {
    return (
      <Screen>
        <EmptyState message="This target hasn't finished syncing yet. Check back once it's online." />
        <Button onPressIn={() => router.back()}>
          <ButtonText>Go back</ButtonText>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.contentWrapper}>
        <FlatList
          data={logsQuery.data?.pages.flatMap((page) => page.data) || []}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <View>
              <TargetDetailHeader targetId={targetId} />
              <Row style={{ marginBottom: 8 }}>
                <ThemedText type="defaultSemiBold">History</ThemedText>
                <TouchableOpacity>
                  <ThemedText type="defaultSemiBold" style={styles.filterText}>
                    Filter
                  </ThemedText>
                </TouchableOpacity>
              </Row>
            </View>
          }
          onEndReached={() => {
            if (logsQuery.hasNextPage && !logsQuery.isFetching) {
              logsQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => (
            <TargetLogItem log={item} targetId={targetId} />
          )}
          ListFooterComponent={() => (
            <ListFooterLoader loading={logsQuery.isFetchingNextPage} />
          )}
          ListEmptyComponent={() => (
            <EmptyState message="No progress logs yet. Add one to track your progress!" />
          )}
          contentContainerStyle={styles.listContent}
        />

        {canLogPayment && (
          <Card>
            <Row style={{ marginBottom: 16 }}>
              <Row justify="flex-start" style={{ flex: 1, marginRight: 12 }}>
                <IconCircle
                  size={32}
                  backgroundColor={PicoThemeVariables.primaryHoverBackground}
                  style={{ marginRight: 12 }}
                >
                  <IconSymbol
                    name="creditcard"
                    size={16}
                    color={PicoThemeVariables.primaryColor}
                  />
                </IconCircle>
                <View>
                  <ThemedText type="defaultSemiBold">
                    Also log as expense
                  </ThemedText>
                  <ThemedText type="caption">
                    Sync payment with your main Gastoslog
                  </ThemedText>
                </View>
              </Row>
              <Switch value={true} onValueChange={() => {}} />
            </Row>
            <Link href={`/target/${targetId}/log`} asChild push>
              <Button style={styles.primaryButton}>
                <IconSymbol
                  name="plus"
                  size={18}
                  color={PicoThemeVariables.backgroundColor}
                />
                <ThemedText style={styles.primaryButtonText}>
                  Log Payment
                </ThemedText>
              </Button>
            </Link>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 16,
    flex: 1,
    textAlign: "center",
  },
  progressRingWrapper: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressValue: {
    fontSize: 28,
  },
  amountSummary: {
    marginTop: 16,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  amountPaid: {
    fontSize: 26,
  },
  amountTargetLabel: {
    marginTop: 2,
  },
  filterText: {
    color: PicoThemeVariables.primaryColor,
  },
  primaryButton: {
    backgroundColor: PicoThemeVariables.primaryColor,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: PicoThemeVariables.backgroundColor,
    fontSize: 16,
    fontWeight: "700",
  },
  pendingRight: {
    alignItems: "flex-end",
    gap: 4,
  },
});
