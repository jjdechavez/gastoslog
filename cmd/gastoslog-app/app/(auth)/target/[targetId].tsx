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
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Row } from "@/components/Row";
import { IconCircle } from "@/components/IconCircle";
import { ListRow } from "@/components/ListRow";
import { Amount } from "@/components/Amount";
import { ProgressRing } from "@/components/ProgressRing";
import { EmptyState, ListFooterLoader, LoadingState, ErrorState } from "@/components/ScreenState";

function TargetDetailHeader({ targetId }: { targetId: string }) {
  const targetQuery = useTarget(targetId);
  const logsQuery = useTargetLogs(targetId);

  if (targetQuery.isPending) {
    return <LoadingState message="Loading target..." />;
  }

  if (targetQuery.isError) {
    return <ErrorState message="Error loading target" />;
  }

  const target = targetQuery.data.data;
  const logs = logsQuery.data?.pages.flatMap((page) => page.data) || [];

  const currentAmount = logs.reduce((sum, log) => sum + log.amount, 0);
  const targetAmount = target.targetAmount / 100;
  const progress =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;

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
          <ThemedText type="caption">
            <Amount cents={currentAmount} type="caption" />
            {" / "}
            <Amount cents={target.targetAmount} type="caption" />
          </ThemedText>
        </ProgressRing>
      </View>
    </ThemedView>
  );
}

function TargetLogItem({ log, targetId }: { log: TargetLog; targetId: string }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push(`/(auth)/target/${targetId}/log/${log.id}/edit`)
      }
    >
      <Card>
        <CardBody>
          <ListRow
            title={log.notes || "Target Payment"}
            subtitle={toFormattedDate(log.entryDate.toString())}
            right={<Amount cents={log.amount} sign="+" tone="primary" style={{ fontWeight: "600" }} />}
          />
        </CardBody>
      </Card>
    </Pressable>
  );
}

export default function TargetDetailScreen() {
  const params = useLocalSearchParams();
  const targetId = params.targetId as string;

  const logsQuery = useTargetLogs(targetId);

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
});
