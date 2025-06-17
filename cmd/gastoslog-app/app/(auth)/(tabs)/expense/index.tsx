import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Alert } from "@/components/Alert";
import {
  FloatingButton,
  styles as floatingButtonStyle,
} from "@/components/FloatingButton";
import { useExpenses } from "@/services/api-hook/expense";
import { fromCentToRegularPrice, toFormattedDate } from "@/services/string";

export default function ExpenseScreen() {
  const expenseResult = useExpenses();
  const params = useLocalSearchParams();

  if (expenseResult.status === "pending") {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Loading</ThemedText>
      </ThemedView>
    );
  }

  if (expenseResult.status === "error") {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Error</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={pstyles.container}>
      {params.success ? (
        <Alert type="success" message={params.success as string} />
      ) : null}

      <FloatingButton>
        <Link href="/(auth)/(tabs)/expense/create" asChild push>
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
        data={expenseResult.data.data}
        renderItem={({ item }) => (
          <Link href={`/(auth)/(tabs)/category/${item.id}/edit`} asChild push>
            <ThemedView
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <ThemedView style={styles.item}>
                <ThemedText type="defaultSemiBold">
                  {toFormattedDate(item.createdAt)}
                </ThemedText>
                <ThemedText type="muted">{item.category.name}</ThemedText>
              </ThemedView>
              <ThemedText>
                -{fromCentToRegularPrice(item.amount, { type: "withDecimal" })}
              </ThemedText>
            </ThemedView>
          </Link>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
  },
});
