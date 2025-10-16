import { Link, router, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
} from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Alert } from "@/components/Alert";
import {
  FloatingButton,
  styles as floatingButtonStyle,
} from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { expenseKeys, useDeleteExpense } from "@/services/api-hook/expense";
import { fromCentToRegularPrice, toFormattedDate } from "@/services/string";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { Expense } from "@/types/expense";
import { useState } from "react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DatePicker } from "@/components/DatePicker";
import { api, cleanEmptyParams } from "@/services/api";
import { OutlineButton } from "@/components/Button";
import { SelectCategory } from "@/components/SelectCategory";
import { SelectItem } from "@/components/Select";

function ExpenseFilters() {
  const params = useLocalSearchParams();
  const filterBy =
    typeof params?.filters === "string"
      ? [params.filters]
      : params.filters || [];

  const currentDate = new Date();
  const selectedDate =
    (params.date as string) ?? currentDate.toISOString().split("T")[0];

  const selectedCategories = params?.category
    ? (params.category as string)
    : "";

  return (
    <ThemedView style={styles.expenseFilterContainer}>
      <ThemedText>Filter By: </ThemedText>

      <ThemedView style={styles.expenseFilterActionsContainer}>
        <OutlineButton
          style={{ flex: 1 }}
          onPress={() => {
            const exist = filterBy.includes("date");
            if (exist) {
              router.setParams({
                filters: filterBy.filter((filter) => filter !== "date"),
                date: undefined,
              });
            } else {
              router.setParams({ filters: [...filterBy, "date"] });
            }
          }}
          active={filterBy.includes("date")}
          label="Date"
        />

        <OutlineButton
          style={{ flex: 1 }}
          onPress={() => {
            const exist = filterBy.includes("category");
            if (exist) {
              router.setParams({
                filters: filterBy.filter((filter) => filter !== "category"),
                category: undefined,
              });
            } else {
              router.setParams({ filters: [...filterBy, "category"] });
            }
          }}
          active={filterBy.includes("category")}
          label="Category"
        />
      </ThemedView>

      {filterBy.includes("date") ? (
        <DatePicker
          value={new Date(selectedDate)}
          onChange={(date) =>
            router.setParams({ date: date.toISOString().split("T")[0] })
          }
          placeholder="Select a date"
          maximumDate={new Date()}
        />
      ) : null}

      {filterBy.includes("category") ? (
        <SelectCategory
          multiple
          value={selectedCategories.split(",").map(Number)}
          onChange={(categories) => {
            const selected = categories as SelectItem[];
            router.setParams({
              category: selected.map((item) => item.value).join(","),
            });
          }}
        />
      ) : null}
    </ThemedView>
  );
}

export default function ExpenseScreen() {
  const params = useLocalSearchParams();

  const query = cleanEmptyParams({
    date: params.date,
    category: params.category,
  });

  const expenseResult = useInfiniteQuery({
    queryKey: expenseKeys.list(query),
    queryFn: ({ pageParam }) =>
      api().expense.list({ ...query, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
  });

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

      <ExpenseFilters />

      <FlatList
        data={expenseResult.data.pages.flatMap((page) => page.data) || []}
        onEndReached={() => {
          if (expenseResult.hasNextPage && !expenseResult.isFetching) {
            expenseResult.fetchNextPage();
          }
        }}
        // onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          return <ExpenseItem key={item.id} expense={item} />;
        }}
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

type ExpenseItemProps = {
  expense: Expense;
};

function ExpenseItem(props: ExpenseItemProps) {
  const router = useRouter();
  const [toggleOption, setToogleOption] = useState(false);

  return (
    <Pressable
      onPress={() => router.push(`/(auth)/expense/${props.expense.id}/edit`)}
      onLongPress={() => setToogleOption((prev) => !prev)}
    >
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
            {toFormattedDate(props.expense.createdAt)}
          </ThemedText>
          <ThemedText type="muted">{props.expense.category.name}</ThemedText>
        </ThemedView>
        <ThemedText>
          -
          {fromCentToRegularPrice(props.expense.amount, {
            type: "withDecimal",
          })}
        </ThemedText>
        {toggleOption ? <ExpenseOption expense={props.expense} /> : null}
      </ThemedView>
    </Pressable>
  );
}

type ExpenseOptionProps = {
  expense: Expense;
};

export function ExpenseOption(props: ExpenseOptionProps) {
  const mutate = useDeleteExpense(props.expense.id.toString());
  const background = useThemeColor({}, "destructive");
  return (
    <Pressable
      onPress={() =>
        RNAlert.alert(
          "Delete Expense",
          "Are you sure you want to delete the expense",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Delete",
              onPress: () => mutate.mutate(),
            },
          ],
        )
      }
      style={{ backgroundColor: background, padding: 18 }}
    >
      <ThemedText type="muted">Delete</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
  },
  expenseFilterContainer: {
    display: "flex",
    gap: 16,
  },
  expenseFilterActionsContainer: {
    display: "flex",
    flexDirection: "row",
    gap: 16,
  },
});
