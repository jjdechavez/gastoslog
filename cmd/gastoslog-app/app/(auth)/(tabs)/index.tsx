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
import { SegmentedControl } from "@/components/SegmentedControl";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { PendingSyncBadge } from "@/components/PendingSyncBadge";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOverviewExpense } from "@/services/api-hook/expense";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { ExpenseOverviewResponse, Period } from "@/types/expense";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";
import {
  formatISODateLong,
  isValidISODate,
  parseISODate,
  todayISO,
  toISODate,
} from "@/services/date";

// Period used to be redeclared here as well as in types/expense.ts; imported so
// the overview and the expense screen can't drift on what a period means.

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

// Formats the selected day for the caption under the summary.
//
// Deliberately NOT `new Date(iso).toLocaleDateString(...)`: that parses the
// YYYY-MM-DD string as UTC midnight, which in a negative-offset zone renders as
// the previous day. Going through the local-calendar helpers in services/date
// keeps the caption on the day the user actually tapped.
const formatDate = (iso: string, period: Period) => {
  if (period === "year") {
    return formatISODateLong(iso).split(", ").pop() ?? iso;
  }
  return formatISODateLong(iso);
};


function OverviewDatePicker() {
  const local = useLocalSearchParams();
  const raw = local.date as string | undefined;
  const selectedDate = raw && isValidISODate(raw) ? raw : todayISO();

  // toISODate (local fields) rather than toISOString (UTC), so "today" stays
  // today for users east of Greenwich in the early hours.
  const handlePickDate = (date: Date) => {
    router.setParams({ date: toISODate(date) });
  };

  // Only a day selector when the period is "today". For month/year the same
  // field silently shifts which month you're looking at, with nothing on screen
  // saying so — so hide it rather than leave a control whose effect isn't
  // discoverable.
  const period = (local.period as Period) ?? "today";
  if (period !== "today") {
    return null;
  }

  return (
    <ThemedView style={styles.dateSection}>
      <DatePicker
        value={parseISODate(selectedDate)}
        onChange={handlePickDate}
        placeholder="Select a date"
        maximumDate={new Date()}
      />
    </ThemedView>
  );
}

function Periods() {
  const local = useLocalSearchParams();
  const period = (local.period as Period) ?? "today";

  return (
    <SegmentedControl
      options={[
        { label: "Today", value: "today" },
        { label: "This Month", value: "month" },
        { label: "This Year", value: "year" },
      ]}
      value={period}
      onChange={(value) => router.setParams({ period: value })}
      style={styles.periodSelector}
    />
  );
}

function TotalOverview() {
  const local = useLocalSearchParams();
  const selectedPeriod = (local.period as Period) ?? "today";
  const rawDate = local.date as string | undefined;
  const selectedDate = rawDate && isValidISODate(rawDate) ? rawDate : todayISO();
  const accentColor = useThemeColor({}, "tint");

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
            // Themed text colour. This was PicoThemeVariables.primaryBackground
            // (lime #a5d601) as text on a card, which is ~1.9:1 — unreadable, and
            // identical in both themes because it's a bare constant.
            valueColor={accentColor}
          />
          <StatCard label="Total Expenses" value={overview.meta.totalCount} />
        </Row>
        <ThemedText type="caption">
          {getPeriodLabel(selectedPeriod)}
          {selectedPeriod === "today"
            ? ` · ${formatDate(selectedDate, selectedPeriod)}`
            : ""}
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
    // No date echo here — the caption above already says which day/period this
    // is, so "No expenses found for today on Oct 5, 2026" repeated it twice.
    return (
      <Card>
        <EmptyState
          message={`No expenses yet ${getPeriodLabel(props.period).toLowerCase()}`}
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

      {/* Period first: it's the primary decision. The date field is a day
          selector that only appears for "today", so it belongs underneath. */}
      <Periods />
      <OverviewDatePicker />
      <TotalOverview />
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    marginBottom: 16,
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
});
