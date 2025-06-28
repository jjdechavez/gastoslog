import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView, TScrollView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { api } from "@/services/api";
import type { ExpenseOverviewResponse } from "@/services/api";
import { PicoLimeStyles, PicoThemeVariables } from "@/styles/pico-lime";
import { HGroup } from "@/components/HGroup";
import { ButtonText } from "@/components/Button";

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

  const fetchOverview = async (period: Period) => {
    try {
      setLoading(true);
      const response = await api().expense.overview(period);
      console.log(response);
      setOverview(response);
    } catch (error) {
      console.error("Error fetching expense overview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(selectedPeriod);
  }, [selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
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

      <ThemedView style={styles.periodSelector}>
        <PeriodButton period="today" label="Today" />
        <PeriodButton period="month" label="Month" />
        <PeriodButton period="year" label="Year" />
      </ThemedView>

      {overview && (
        <>
          <ThemedView style={{ display: "flex" }}>
            <Card style={styles.summaryCard}>
              <ThemedText type="subtitle">Total Spent</ThemedText>
              <ThemedText type="title" style={styles.totalAmount}>
                {formatCurrency(overview.meta.totalAmount / 100)}
              </ThemedText>
            </Card>

            <Card style={styles.summaryCard}>
              <ThemedText type="subtitle">Total Expenses</ThemedText>
              <ThemedText type="title">{overview.meta.totalCount}</ThemedText>
            </Card>
          </ThemedView>

          <ThemedView style={styles.categoriesSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Category
            </ThemedText>

            {overview.data.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText style={styles.emptyText}>
                  No expenses found for{" "}
                  {getPeriodLabel(selectedPeriod).toLowerCase()}
                </ThemedText>
              </Card>
            ) : (
              overview.data.map((category) => (
                <Card key={category.categoryId} style={styles.categoryCard}>
                  <ThemedView variant="card" style={styles.categoryHeader}>
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

                  <ThemedView variant="card" style={styles.categoryDetails}>
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
});
