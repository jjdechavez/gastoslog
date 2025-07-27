import { ButtonText } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePicker } from "@/components/DatePicker";
import { HGroup } from "@/components/HGroup";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView, TScrollView } from "@/components/ThemedView";
import { api } from "@/services/api";
import { PicoLimeStyles, PicoThemeVariables } from "@/styles/pico-lime";
import type { ExpenseOverviewResponse } from "@/types/expense";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";

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

export default function HomeScreen() {
  const [overview, setOverview] = useState<ExpenseOverviewResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("today");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchOverview = async (period: Period, date?: string) => {
    try {
      setLoading(true);
      const response = await api().expense.overview(period, date);
      setOverview(response);
    } catch (error) {
      console.error("Error fetching expense overview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dateString = selectedDate.toISOString().split("T")[0];
    fetchOverview(selectedPeriod, dateString);
  }, [selectedPeriod, selectedDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
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

  const PeriodButton = ({
    period,
    label,
  }: {
    period: Period;
    label: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.periodButtonActive,
      ]}
      onPress={() => setSelectedPeriod(period)}
    >
      <ButtonText
        style={[
          styles.periodButtonText,
          selectedPeriod === period && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </ButtonText>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Loading overview...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <TScrollView style={PicoLimeStyles.container}>
      <HGroup title="Overview" />

      <ThemedView style={styles.dateSection}>
        <ThemedText type="subtitle" style={styles.dateLabel}>
          Select Date
        </ThemedText>
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          placeholder="Select a date"
          maximumDate={new Date()}
        />
      </ThemedView>

      <ThemedView style={styles.periodSelector}>
        <PeriodButton period="today" label="Today" />
        <PeriodButton period="month" label="Month" />
        <PeriodButton period="year" label="Year" />
      </ThemedView>

      {overview && (
        <>
          <Card style={styles.summaryCard}>
            <ThemedView style={styles.summaryRow} variant="card">
              <ThemedView variant="card">
                <ThemedText type="subtitle">Total Spent</ThemedText>
                <ThemedText type="title" style={styles.totalAmount}>
                  {formatCurrency(overview.meta.totalAmount / 100)}
                </ThemedText>
              </ThemedView>
              <ThemedView variant="card">
                <ThemedText type="subtitle">Total Expenses</ThemedText>
                <ThemedText type="title">{overview.meta.totalCount}</ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedText style={styles.dateInfo}>
              {getPeriodLabel(selectedPeriod)} of {formatDate(selectedDate, selectedPeriod)}
            </ThemedText>
          </Card>

          <ThemedView style={styles.categoriesSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              By Category
            </ThemedText>

            {overview.data.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>
                  No expenses found for{" "}
                  {getPeriodLabel(selectedPeriod).toLowerCase()} of{" "}
                  {formatDate(selectedDate, selectedPeriod)}
                </ThemedText>
              </Card>
            ) : (
              overview.data.map((category) => (
                <Card key={category.categoryId} style={styles.categoryCard}>
                  <ThemedView style={styles.categoryHeader} variant="card">
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.categoryName}
                    >
                      {category.categoryName}
                    </ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.categoryAmount}
                    >
                      {formatCurrency(category.totalAmount)}
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.categoryDetails} variant="card">
                    <ThemedText style={styles.categoryCount}>
                      {category.count} expense{category.count !== 1 ? "s" : ""}
                    </ThemedText>
                    <ThemedText style={styles.categoryPercentage}>
                      {category.percentage.toFixed(1)}%
                    </ThemedText>
                  </ThemedView>

                  <ThemedView style={styles.progressBar}>
                    <ThemedView
                      style={[
                        styles.progressFill,
                        { width: `${category.percentage}%` },
                      ]}
                    />
                  </ThemedView>
                </Card>
              ))
            )}
          </ThemedView>
        </>
      )}
    </TScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    marginBottom: 24,
    gap: 8,
  },
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalAmount: {
    color: PicoThemeVariables.primaryBackground,
  },
  categoriesSection: {
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.6,
  },
  categoryCard: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    flex: 1,
  },
  categoryAmount: {
    color: PicoThemeVariables.primaryBackground,
  },
  categoryDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryCount: {
    opacity: 0.6,
    fontSize: 14,
  },
  categoryPercentage: {
    opacity: 0.6,
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: PicoThemeVariables.primaryBackground,
    borderRadius: 2,
  },
  dateSection: {
    marginBottom: 24,
    gap: 8,
  },
  dateLabel: {
    marginBottom: 8,
  },
  dateInfo: {
    opacity: 0.6,
    fontSize: 14,
  },
});
