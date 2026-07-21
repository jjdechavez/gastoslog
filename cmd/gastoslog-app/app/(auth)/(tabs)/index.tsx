import { ButtonText } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePicker } from "@/components/DatePicker";
import { HGroup } from "@/components/HGroup";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Screen } from "@/components/Screen";
import { Row } from "@/components/Row";
import { StatCard } from "@/components/StatCard";
import { Amount } from "@/components/Amount";
import { ProgressBar } from "@/components/ProgressBar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { PendingSyncBadge } from "@/components/PendingSyncBadge";
import { useOverviewExpense } from "@/services/api-hook/expense";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { ExpenseOverviewResponse } from "@/types/expense";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

type Period = "today" | "month" | "year";

const getPeriodLabel = (period: Period) => {
  switch (period) {
    case "today":
      return "Today";
    case "month":
      return "This Month";
    case "year":
      return "This Year";
  }
};

const formatDate = (date: Date, period: Period) => {
  const options: Intl.DateTimeFormatOptions = {};
  switch (period) {
    case "today":
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      break;
    case "month":
      options.year = "numeric";
      options.month = "long";
      break;
    case "year":
      options.year = "numeric";
      break;
    default:
      // Fallback for unexpected viewType, or default to full date
      options.year = "numeric";
      options.month = "long";
      options.day = "numeric";
      break;
  }

  return date.toLocaleDateString("en-PH", options);
};

function PeriodButton(props: { period: Period; label: string }) {
  const local = useLocalSearchParams();
  const localPeriod = local?.period ?? "today";
  return (
    <TouchableOpacity
      style={[
        styles.periodButton,
        localPeriod === props.period && styles.periodButtonActive,
      ]}
      onPress={() => router.setParams({ period: props.period })}
    >
      <ButtonText
        style={[
          styles.periodButtonText,
          localPeriod === props.period && styles.periodButtonTextActive,
        ]}
      >
        {props.label}
      </ButtonText>
    </TouchableOpacity>
  );
}

function OverviewDatePicker() {
  const local = useLocalSearchParams();
  const currentDate = new Date();
  const selectedDate =
    (local.date as string) ?? currentDate.toISOString().split("T")[0];

  const handlePickDate = (date: Date) => {
    router.setParams({ date: date.toISOString().split("T")[0] });
  };

  return (
    <ThemedView style={styles.dateSection}>
      <ThemedText type="subtitle" style={styles.dateLabel}>
        Select Date
      </ThemedText>
      <DatePicker
        value={new Date(selectedDate)}
        onChange={handlePickDate}
        placeholder="Select a date"
        maximumDate={new Date()}
      />
    </ThemedView>
  );
}

function Periods() {
  return (
    <ThemedView style={styles.periodSelector}>
      <PeriodButton period="today" label="Today" />
      <PeriodButton period="month" label="Month" />
      <PeriodButton period="year" label="Year" />
    </ThemedView>
  );
}

function TotalOverview() {
  const local = useLocalSearchParams();
  const selectedPeriod = (local.period as Period) ?? "today";
  const currentDate = new Date();
  const selectedDate =
    (local.date as string) ?? currentDate.toISOString().split("T")[0];

  const { data: overview, status } = useOverviewExpense({
    period: selectedPeriod,
    date: selectedDate,
  });
  const isOnline = useOnlineStatus();

  if (status === "pending" || status === "error") {
    if (!isOnline) {
      return (
        <EmptyState message="You're offline — this overview will appear once you've synced." />
      );
    }
    if (status === "pending") {
      return <LoadingState message="Loading overview..." />;
    }
    return <ErrorState message="Failed to fetch overview" />;
  }

  return (
    <>
      <Card style={styles.summaryCard}>
        <Row>
          <StatCard
            label="Total Spent"
            value={
              <Amount type="title" cents={overview.meta.totalAmount} />
            }
            valueColor={PicoThemeVariables.primaryBackground}
          />
          <StatCard label="Total Expenses" value={overview.meta.totalCount} />
        </Row>
        <ThemedText type="caption">
          {getPeriodLabel(selectedPeriod)} of{" "}
          {formatDate(new Date(selectedDate), selectedPeriod)}
        </ThemedText>
      </Card>

      <OverviewByCategory
        overview={overview}
        date={selectedDate}
        period={selectedPeriod}
      />
    </>
  );
}

type OverviewByCategoryProps = {
  overview: ExpenseOverviewResponse;
  date: string;
  period: Period;
};

function OverviewByCategory(props: OverviewByCategoryProps) {
  if (props.overview.data.length === 0) {
    return (
      <Card>
        <EmptyState
          message={`No expenses found for ${getPeriodLabel(props.period).toLowerCase()} of ${formatDate(new Date(props.date), props.period)}`}
        />
      </Card>
    );
  }

  return props.overview.data.map((category) => (
    <Card key={category.categoryId} style={styles.categoryCard}>
      <Row style={{ marginBottom: 8 }}>
        <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
          {category.categoryName}
        </ThemedText>
        <Amount
          type="defaultSemiBold"
          tone="primary"
          cents={category.totalAmount * 100}
        />
      </Row>

      <Row style={{ marginBottom: 8 }}>
        <ThemedText type="caption">
          {category.count} expense{category.count !== 1 ? "s" : ""}
        </ThemedText>
        <ThemedText type="caption">{category.percentage.toFixed(1)}%</ThemedText>
      </Row>

      <ProgressBar value={category.percentage} height={4} />
    </Card>
  ));
}

export default function HomeScreen() {
  return (
    <Screen scroll>
      <HGroup title="Overview" />
      <PendingSyncBadge />

      <OverviewDatePicker />
      <Periods />
      <TotalOverview />
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: PicoThemeVariables.primaryBackground,
    borderColor: PicoThemeVariables.primaryBorder,
  },
  periodButtonText: {
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: "white",
  },
  summaryCard: {
    marginBottom: 24,
    flex: 1,
  },
  categoryCard: {
    marginBottom: 8,
  },
  dateSection: {
    marginBottom: 24,
    gap: 8,
  },
  dateLabel: {
    marginBottom: 8,
  },
});
