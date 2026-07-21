import { Link, router, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useTarget, useTargetLogs } from "@/services/api-hook/target";
import { fromCentToRegularPrice, toFormattedDate } from "@/services/string";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { TargetLog } from "@/types/target";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";

function TargetDetailHeader({ targetId }: { targetId: string }) {
  const targetQuery = useTarget(targetId);
  const logsQuery = useTargetLogs(targetId);

  if (targetQuery.isPending) {
    return <ThemedText>Loading target...</ThemedText>;
  }

  if (targetQuery.isError) {
    return <ThemedText>Error loading target</ThemedText>;
  }

  const target = targetQuery.data.data;
  const logs = logsQuery.data?.pages.flatMap((page) => page.data) || [];

  const currentAmount = logs.reduce((sum, log) => sum + log.amount, 0);
  const targetAmount = target.targetAmount / 100;
  const progress =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
  const ringSize = 176;
  const ringStroke = 12;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgressOffset =
    ringCircumference - (progress / 100) * ringCircumference;

  return (
    <ThemedView>
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          {target.name}
        </ThemedText>
      </View>

      <View style={styles.progressRingWrapper}>
        <Svg width={ringSize} height={ringSize} style={styles.ringSvg}>
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            stroke={PicoThemeVariables.formElementBorder}
            strokeWidth={ringStroke}
            fill="none"
          />
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            stroke={PicoThemeVariables.primaryColor}
            strokeWidth={ringStroke}
            fill="none"
            strokeDasharray={`${ringCircumference} ${ringCircumference}`}
            strokeDashoffset={ringProgressOffset}
            strokeLinecap="round"
          />
        </Svg>

        <ThemedView style={styles.ringCenter}>
          <ThemedText type="muted" style={styles.progressLabel}>
            PAID
          </ThemedText>
          <ThemedText style={styles.progressValue} type="defaultSemiBold">
            {progress.toFixed(0)}%
          </ThemedText>
          <ThemedText type="muted" style={styles.progressAmount}>
            {fromCentToRegularPrice(currentAmount, { type: "withDecimal" })}
            {" / "}
            {fromCentToRegularPrice(target.targetAmount, {
              type: "withDecimal",
            })}
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

function TargetLogItem({ log }: { log: TargetLog }) {
  return (
    <Pressable>
      <Card>
        <CardBody style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.logLeft}>
            <ThemedText type="muted" style={styles.logDate}>
              {toFormattedDate(log.entryDate.toString())}
            </ThemedText>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {log.notes || "Target Payment"}
            </ThemedText>
          </View>
          <ThemedText style={styles.logAmount}>
            +{fromCentToRegularPrice(log.amount, { type: "withDecimal" })}
          </ThemedText>
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
    <ThemedView style={pstyles.container}>
      <View style={styles.contentWrapper}>
        <FlatList
          data={logsQuery.data?.pages.flatMap((page) => page.data) || []}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <View>
              <TargetDetailHeader targetId={targetId} />
              <View style={styles.historyHeader}>
                <ThemedText type="defaultSemiBold">History</ThemedText>
                <TouchableOpacity>
                  <ThemedText type="defaultSemiBold" style={styles.filterText}>
                    Filter
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          }
          onEndReached={() => {
            if (logsQuery.hasNextPage && !logsQuery.isFetching) {
              logsQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => <TargetLogItem log={item} />}
          ListFooterComponent={() => {
            if (logsQuery.isFetchingNextPage) {
              return <ThemedText>Loading...</ThemedText>;
            }
            return null;
          }}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText type="muted">
                No progress logs yet. Add one to track your progress!
              </ThemedText>
            </ThemedView>
          )}
          contentContainerStyle={styles.listContent}
        />

        <Card>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelWrap}>
              <View style={styles.toggleIcon}>
                <IconSymbol
                  name="creditcard"
                  size={16}
                  color={PicoThemeVariables.primaryColor}
                />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">
                  Also log as expense
                </ThemedText>
                <ThemedText type="muted" style={styles.toggleCaption}>
                  Sync payment with your main Gastoslog
                </ThemedText>
              </View>
            </View>
            <Switch value={true} onValueChange={() => {}} />
          </View>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: PicoThemeVariables.cardBackground,
    borderRadius: PicoThemeVariables.borderRadius,
    padding: 16,
    marginBottom: 16,
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.cardBorder,
  },
  contentWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PicoThemeVariables.secondaryBackground,
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
  ringSvg: {
    transform: [{ rotateZ: "-90deg" }],
  },
  ringCenter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  progressValue: {
    fontSize: 28,
  },
  progressAmount: {
    fontSize: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filterText: {
    color: PicoThemeVariables.primaryColor,
  },
  logLeft: {
    flex: 1,
    marginRight: 12,
  },
  logDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  logAmount: {
    color: PicoThemeVariables.primaryColor,
    fontSize: 14,
    fontWeight: "600",
  },
  footerCard: {
    backgroundColor: PicoThemeVariables.cardBackground,
    borderRadius: PicoThemeVariables.borderRadius,
    padding: 16,
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.cardBorder,
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  toggleLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  toggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 32,
    backgroundColor: PicoThemeVariables.primaryHoverBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  toggleCaption: {
    fontSize: 12,
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
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
});
