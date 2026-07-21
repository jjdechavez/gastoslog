import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { Alert } from "@/components/Alert";
import {
  FloatingButton,
  styles as floatingButtonStyle,
} from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useTargetLogs, useTargets } from "@/services/api-hook/target";
import { fromCentToRegularPrice, toFormattedDate } from "@/services/string";
import {
  PicoLimeStyles,
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { Target } from "@/types/target";
import { HGroup } from "@/components/HGroup";
import { Card, CardBody, CardHeader } from "@/components/Card";

type TargetWithProgress = Target & {
  currentAmount: number;
};

function TargetItem({
  target,
  onPress,
}: {
  target: TargetWithProgress;
  onPress: () => void;
}) {
  const currentAmount = target.currentAmount;
  const targetAmount = target.targetAmount / 100;
  const progress =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
  const isCompleted = currentAmount >= targetAmount;

  return (
    <Pressable onPress={onPress}>
      <Card>
        <CardHeader>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <ThemedText type="defaultSemiBold">{target.name}</ThemedText>
            <View
              style={[
                styles.statusBadge,
                isCompleted && styles.statusCompleted,
              ]}
            >
              <ThemedText style={styles.statusText}>{target.status}</ThemedText>
            </View>
          </View>

          <View style={styles.targetInfo}>
            <ThemedText type="muted">
              {target.type} • {target.direction}
            </ThemedText>
            {target.deadlineAt && (
              <ThemedText type="muted">
                Due: {toFormattedDate(target.deadlineAt.toString())}
              </ThemedText>
            )}
          </View>
        </CardHeader>

        <CardBody>
          <View style={styles.progressContainer}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <ThemedText type="muted">Progress</ThemedText>
              <View style={{ flexDirection: "row" }}>
                <ThemedText style={styles.progressText}>
                  {fromCentToRegularPrice(currentAmount * 100, {
                    type: "withDecimal",
                  })}
                </ThemedText>
                <ThemedText type="muted">
                  {" / "}
                  {fromCentToRegularPrice(target.targetAmount, {
                    type: "withDecimal",
                  })}
                </ThemedText>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%` },
                  isCompleted && styles.progressCompleted,
                ]}
              />
            </View>
          </View>
        </CardBody>
      </Card>
    </Pressable>
  );
}

function TargetListItem({ target }: { target: Target }) {
  const router = useRouter();
  const logsResult = useTargetLogs(target.id.toString());

  const currentAmount =
    logsResult.data?.pages
      .flatMap((page) => page.data)
      .reduce((sum, log) => sum + log.amount, 0) ?? 0;

  const targetWithProgress: TargetWithProgress = {
    ...target,
    currentAmount,
  };

  return (
    <TargetItem
      target={targetWithProgress}
      onPress={() => router.push(`/(auth)/target/${target.id}`)}
    />
  );
}

export default function TargetScreen() {
  const params = useLocalSearchParams();
  const query = {};

  const targetResult = useTargets(query);

  if (targetResult.isPending) {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Loading</ThemedText>
      </ThemedView>
    );
  }

  if (targetResult.isError) {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Error</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={pstyles.container}>
      <HGroup title="Targets" />
      {params.success ? (
        <Alert type="success" message={params.success as string} />
      ) : null}

      <FloatingButton>
        <Link href="/target/create" asChild push>
          <TouchableOpacity style={floatingButtonStyle.button}>
            <IconSymbol
              name="plus"
              color={PicoThemeVariables.primaryColor}
              size={30}
            />
          </TouchableOpacity>
        </Link>
      </FloatingButton>

      <FlatList
        data={targetResult.data.pages.flatMap((page) => page.data) || []}
        onEndReached={() => {
          if (targetResult.hasNextPage && !targetResult.isFetching) {
            targetResult.fetchNextPage();
          }
        }}
        renderItem={({ item }) => {
          return <TargetListItem key={item.id} target={item} />;
        }}
        ListFooterComponent={() => {
          if (targetResult.isFetchingNextPage) {
            return <ThemedText>Loading...</ThemedText>;
          }
          return null;
        }}
        ListEmptyComponent={() => (
          <ThemedView style={styles.emptyContainer}>
            <ThemedText type="muted">
              No targets yet. Create one to get started!
            </ThemedText>
          </ThemedView>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    backgroundColor: PicoThemeVariables.secondaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: PicoThemeVariables.primaryBackground,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
  },
  targetInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: PicoThemeVariables.formElementBorder,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: PicoThemeVariables.primaryBackground,
    borderRadius: 4,
  },
  progressCompleted: {
    backgroundColor: PicoThemeVariables.primaryColor,
  },
  progressText: {
    textAlign: "right",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
});
