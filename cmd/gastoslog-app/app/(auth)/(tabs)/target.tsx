import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Pressable } from "react-native";

import { Alert } from "@/components/Alert";
import { FloatingButton } from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { Screen } from "@/components/Screen";
import { Row } from "@/components/Row";
import { Badge } from "@/components/Badge";
import { ProgressBar } from "@/components/ProgressBar";
import { Amount } from "@/components/Amount";
import {
  ScreenState,
  EmptyState,
  ListFooterLoader,
} from "@/components/ScreenState";
import { useTargetLogs, useTargets } from "@/services/api-hook/target";
import { toFormattedDate } from "@/services/string";
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
          <Row>
            <ThemedText type="defaultSemiBold">{target.name}</ThemedText>
            <Badge variant={isCompleted ? "success" : "default"}>
              {target.status}
            </Badge>
          </Row>

          <Row style={{ marginBottom: 12 }}>
            <ThemedText type="muted">
              {target.type} • {target.direction}
            </ThemedText>
            {target.deadlineAt && (
              <ThemedText type="muted">
                Due: {toFormattedDate(target.deadlineAt.toString())}
              </ThemedText>
            )}
          </Row>
        </CardHeader>

        <CardBody>
          <Row style={{ marginBottom: 8 }}>
            <ThemedText type="muted">Progress</ThemedText>
            <Row justify="flex-end" gap={0}>
              <Amount
                cents={currentAmount * 100}
                style={{ textAlign: "right", fontSize: 14 }}
              />
              <ThemedText type="muted">
                {" / "}
                <Amount cents={target.targetAmount} type="muted" />
              </ThemedText>
            </Row>
          </Row>
          <ProgressBar value={progress} completed={isCompleted} />
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

  return (
    <Screen>
      <ScreenState query={targetResult}>
        <HGroup title="Targets" />
        {params.success ? (
          <Alert type="success" message={params.success as string} />
        ) : null}

        <FloatingButton href="/target/create" />

        {targetResult.status === "success" && (
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
            ListFooterComponent={() => (
              <ListFooterLoader loading={targetResult.isFetchingNextPage} />
            )}
            ListEmptyComponent={() => (
              <EmptyState message="No targets yet. Create one to get started!" />
            )}
          />
        )}
      </ScreenState>
    </Screen>
  );
}
