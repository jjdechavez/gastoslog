import { router, useLocalSearchParams, useRouter } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  Alert as RNAlert,
} from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Alert } from "@/components/Alert";
import { FloatingButton } from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Screen } from "@/components/Screen";
import { ListRow } from "@/components/ListRow";
import { Amount } from "@/components/Amount";
import { PendingSyncBadge } from "@/components/PendingSyncBadge";
import { PendingTag } from "@/components/PendingTag";
import {
  ScreenState,
  ListFooterLoader,
} from "@/components/ScreenState";
import { expenseKeys, useDeleteExpense } from "@/services/api-hook/expense";
import { toFormattedDate } from "@/services/string";
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

  return (
    <Screen>
      <ScreenState query={expenseResult}>
        {params.success ? (
          <Alert type="success" message={params.success as string} />
        ) : null}

        <FloatingButton href="/(auth)/expense/create" />

        <PendingSyncBadge />

        <ExpenseFilters />

        {expenseResult.status === "success" && (
          <FlatList
            data={expenseResult.data.pages.flatMap((page) => page.data) || []}
            onEndReached={() => {
              if (expenseResult.hasNextPage && !expenseResult.isFetching) {
                expenseResult.fetchNextPage();
              }
            }}
            renderItem={({ item }) => {
              return <ExpenseItem key={item.id} expense={item} />;
            }}
            ListFooterComponent={() => (
              <ListFooterLoader loading={expenseResult.isFetchingNextPage} />
            )}
          />
        )}
      </ScreenState>
    </Screen>
  );
}

type ExpenseItemProps = {
  expense: Expense;
};

function ExpenseItem(props: ExpenseItemProps) {
  const router = useRouter();
  const [toggleOption, setToogleOption] = useState(false);
  // Optimistic rows use a negative temp id (see services/offline/mutation-defaults.ts)
  // and can't be opened for edit/delete yet — no server id exists until the
  // create mutation resolves and the list is invalidated/refetched.
  const isOptimistic =
    props.expense.id < 0 || (props.expense as any).__optimistic === true;

  return (
    <Pressable
      onPress={() => {
        if (isOptimistic) {
          return;
        }
        router.push(`/(auth)/expense/${props.expense.id}/edit`);
      }}
      onLongPress={() => {
        if (isOptimistic) {
          return;
        }
        setToogleOption((prev) => !prev);
      }}
    >
      <ListRow
        style={styles.item}
        title={toFormattedDate(props.expense.createdAt)}
        subtitle={props.expense.category.name}
        right={
          isOptimistic ? (
            <View style={styles.pendingRight}>
              <Amount cents={props.expense.amount} sign="-" tone="muted" />
              <PendingTag />
            </View>
          ) : (
            <Amount cents={props.expense.amount} sign="-" />
          )
        }
      />
      {toggleOption ? <ExpenseOption expense={props.expense} /> : null}
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
  },
  pendingRight: {
    alignItems: "flex-end",
    gap: 4,
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
