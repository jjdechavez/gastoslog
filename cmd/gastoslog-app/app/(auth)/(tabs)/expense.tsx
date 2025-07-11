import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, TouchableOpacity } from "react-native";

import { Alert } from "@/components/Alert";
import {
  FloatingButton,
  styles as floatingButtonStyle,
} from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useInfiniteExpenses } from "@/services/api-hook/expense";
import { fromCentToRegularPrice, toFormattedDate } from "@/services/string";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";

export default function ExpenseScreen() {
  const expenseResult = useInfiniteExpenses();
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
        <Link href="/(auth)/expense/create" asChild push>
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
        data={expenseResult.data.pages.flatMap((page) => page.data) || []}
        onEndReached={() => {
          if (expenseResult.hasNextPage && !expenseResult.isFetching) {
            expenseResult.fetchNextPage();
          }
        }}
        // onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          return (
          <Link href={`/(auth)/expense/${item.id}/edit`} push>
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
        )}}
        ListFooterComponent={() => {
          if (expenseResult.isFetchingNextPage) {
            return <ThemedText>Loading...</ThemedText>;
          }
          return null;
        }}
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
})
