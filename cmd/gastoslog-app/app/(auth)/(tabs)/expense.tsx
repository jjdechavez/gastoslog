import { router, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
  Alert as RNAlert,
} from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";

import { FloatingButton } from "@/components/FloatingButton";
import { ThemedText } from "@/components/ThemedText";
import { Screen } from "@/components/Screen";
import { ListRow } from "@/components/ListRow";
import { Amount } from "@/components/Amount";
import { PendingSyncBadge } from "@/components/PendingSyncBadge";
import { PendingTag } from "@/components/PendingTag";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FilterChip } from "@/components/FilterChip";
import { SelectCategory } from "@/components/SelectCategory";
import {
  expenseKeys,
  useDeleteExpense,
  useExpenseSummary,
} from "@/services/api-hook/expense";
import { Expense } from "@/types/expense";
import type { ExpenseFilter } from "@/types/expense";
import { useState } from "react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { api, cleanEmptyParams } from "@/services/api";
import {
  dayLabel,
  formatRangeLabel,
  isValidISODate,
  toISODate,
} from "@/services/date";
import { usePendingExpenseTotal } from "@/services/offline/usePendingExpenseTotal";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { PicoThemeVariables } from "@/styles/pico-lime";

// A param can come back as string | string[] from expo-router depending on how
// it was set; take the first usable value.
function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function categorySummary(category: string | undefined): string | undefined {
  if (!category) return undefined;
  const ids = category.split(",").filter(Boolean);
  if (ids.length === 0) return undefined;
  return ids.length === 1 ? "1 category" : `${ids.length} categories`;
}

/** One place that decides whether ANY filter is narrowing the list. */
function isFilterActive(filter: ExpenseFilter): boolean {
  return Boolean(filter.from || filter.to || filter.category);
}

/** The single "remove every filter" action, shared by every clear affordance. */
function clearAllFilters() {
  router.setParams({
    from: undefined,
    to: undefined,
    category: undefined,
  });
}

/**
 * Filters live in one horizontally scrollable row of chips rather than a stack of
 * full-width inputs. Three stacked controls consumed roughly a third of the
 * viewport before any content appeared; a chip row costs a single line and keeps
 * every active value visible at once, so the user can see what is narrowing the
 * list without expanding anything.
 */
function ExpenseFilterBar(props: {
  filter: ExpenseFilter;
  summaryOn: boolean;
}) {
  const categories = categorySummary(props.filter.category);
  const dateActive = Boolean(props.filter.from || props.filter.to);

  return (
    <ScrollableRow>
      <DateRangePicker
        variant="chip"
        value={{ from: props.filter.from, to: props.filter.to }}
        onChange={(range) =>
          router.setParams({ from: range.from, to: range.to })
        }
        placeholder="Date"
        maximumDate={new Date()}
      />

      <SelectCategory
        multiple
        value={(props.filter.category ?? "")
          .split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n))}
        onChange={(selected) => {
          const items = (selected ?? []) as { value: number }[];
          router.setParams({
            category: items.map((item) => item.value).join(","),
          });
        }}
        renderTrigger={({ label, onPress }) => (
          <FilterChip
            // Inactive, this names the field ("Category") rather than repeating
            // the interaction ("Select a category"), which is both shorter and
            // reads as a label. Once active, show the resolved value.
            label={categories ?? "Category"}
            active={Boolean(categories)}
            onPress={onPress}
            accessibilityLabel={`Filter by category, currently ${
              categories ?? "any category"
            }`}
            onClear={
              categories
                ? () => router.setParams({ category: undefined })
                : undefined
            }
          />
        )}
      />


      {/*
        The way back to a hidden total.

        Hiding the total used to be a one-way trip: the "Hide" control lives
        *inside* the bar, so once the bar was gone nothing on screen could bring
        it back. This chip is that missing affordance — it appears only when the
        total is hidden, so the bar is on-screen by default and this is a
        deliberate escape hatch rather than permanent chrome.
      */}
      {!props.summaryOn ? (
        <FilterChip
          label="Show total"
          onPress={() => router.setParams({ summary: undefined })}
          accessibilityLabel="Show the total for the current filter"
        />
      ) : null}

      {dateActive || categories ? (
        <FilterChip label="Clear all" onPress={clearAllFilters} />
      ) : null}
    </ScrollableRow>
  );
}

// A thin wrapper so every filter control in the row shares one scroller without
// each call site restating the ScrollView props.
//
// The outer View matters: React Native's horizontal ScrollView base style sets
// flexGrow: 1 / flexShrink: 1, so left to itself inside Screen's flex column it
// grows to absorb spare vertical space and leaves a large void between the chips
// and the content below. Pinning the shell to its content height fixes that.
function ScrollableRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.filterBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Counteracts the ScrollView base style's flexGrow: 1.
        style={styles.filterScroller}
        contentContainerStyle={styles.filterBarContent}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Total for the current filter.
 *
 * Sits directly above the list as a single compact bar rather than a card: the
 * number is a persistent reference point while scrolling, so it shouldn't cost a
 * large block of vertical space on every visit.
 */
function ExpenseTotalBar(props: { filter: ExpenseFilter }) {
  const { data, status, isFetching } = useExpenseSummary(props.filter);
  const pending = usePendingExpenseTotal();
  const isOnline = useOnlineStatus();

  // Themed rather than PicoThemeVariables.formElementBackground, which is a
  // light-mode constant and rendered this card near-white in dark mode.
  const surfaceColor = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "borderColor");
  const accentColor = useThemeColor({}, "tint");

  const rangeLabel = formatRangeLabel({
    from: props.filter.from,
    to: props.filter.to,
  });

  const barStyle = [
    styles.totalBar,
    { backgroundColor: surfaceColor, borderColor },
  ];

  if (status === "pending") {
    return (
      <View style={barStyle}>
        <View style={styles.totalStatusRow}>
          <ActivityIndicator size="small" />
          <ThemedText type="caption" style={styles.totalCaption}>
            Calculating total…
          </ThemedText>
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={barStyle}>
        <ThemedText type="caption" style={styles.totalCaption}>
          {isOnline
            ? "Could not load the total for this filter."
            : "Offline — the total refreshes once you sync."}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={barStyle}>
      <ThemedText type="label" style={styles.totalLabel}>
        Total spent
      </ThemedText>

      <View style={styles.totalRow}>
        {/* Sized below the page title on purpose: the title frames the screen,
            this number is the content's hero. Matching them flattened the
            hierarchy. */}
        <Amount
          type="defaultSemiBold"
          style={styles.totalAmount}
          cents={data.totalAmount}
        />
        <ThemedText type="caption" style={styles.totalCount}>
          {data.totalCount} {data.totalCount === 1 ? "expense" : "expenses"}
        </ThemedText>
      </View>

      <View style={styles.totalMetaRow}>
        <ThemedText type="caption" numberOfLines={1} style={styles.totalCaption}>
          {rangeLabel}
          {isFetching ? " · updating" : ""}
        </ThemedText>

        {/* Show/hide lives with the number it controls, so it never has to be
            hunted for. Hiding is reversible — a "Show total" chip appears in
            the filter row — but say so here rather than letting the control read
            as a one-way trip. */}
        <Pressable
          onPress={() => router.setParams({ summary: "0" })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Hide total. You can show it again from the filter row."
        >
          <ThemedText type="small" style={[styles.totalToggle, { color: accentColor }]}>
            Hide
          </ThemedText>
        </Pressable>
      </View>

      {pending.count > 0 ? (
        // The server total can't include expenses that only exist on this
        // device yet, so show them as an explicit addend rather than letting the
        // headline number quietly read low.
        <ThemedText type="small" style={styles.pendingTotal}>
          +<Amount cents={pending.amount} tone="muted" /> not yet synced (
          {pending.count})
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Slim, opaque day header acting as a scanning waypoint, with the day's subtotal. */
function DaySectionHeader(props: { label: string; total: number }) {
  const background = useThemeColor({}, "background");
  return (
    <View style={[styles.dayHeader, { backgroundColor: background }]}>
      <ThemedText type="label">{props.label}</ThemedText>
      <Amount type="small" tone="muted" cents={props.total} />
    </View>
  );
}

type DaySection = {
  key: string;
  label: string;
  total: number;
  data: Expense[];
};

/**
 * Bucket expenses by local calendar day.
 *
 * People scan an expense log in chunks ("what did I spend on Friday"), so day
 * headers act as waypoints, and a per-day subtotal answers that without
 * arithmetic. Uses the expense's own local day rather than a UTC slice, so a row
 * always appears under the date the user would recognise.
 *
 * A plain function rather than a useMemo: it runs once per render over the
 * loaded rows, which is trivial for a page of expenses and keeps the component
 * free of memoization hooks. The one thing that *is* worth keeping stable is the
 * list callbacks below, so SectionList doesn't rebuild every row on each render.
 */
function buildSections(expenses: Expense[]): DaySection[] {
  if (expenses.length === 0) return [];

  const buckets = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const day = toISODate(new Date(expense.createdAt));
    const existing = buckets.get(day);
    if (existing) {
      existing.push(expense);
    } else {
      buckets.set(day, [expense]);
    }
  }

  return Array.from(buckets.entries()).map(([day, items]) => ({
    key: day,
    label: dayLabel(day),
    total: items.reduce((sum, item) => sum + item.amount, 0),
    data: items,
  }));
}

// Module-level so SectionList sees a stable identity across renders without a
// useCallback. Must be declared after ExpenseItem (hoisted function declaration,
// so order doesn't matter for the binding).
function renderExpenseItem({ item }: { item: Expense }) {
  return <ExpenseItem expense={item} />;
}

function expenseKeyExtractor(item: Expense) {
  return `${item.id}`;
}

export default function ExpenseScreen() {
  const params = useLocalSearchParams();

  const fromParam = firstParam(params.from);
  const toParam = firstParam(params.to);
  const categoryParam = firstParam(params.category);

  // One filter object feeding BOTH the list and the summary. Deriving them
  // separately is how a "total" ends up quietly disagreeing with the rows below
  // it.
  //
  // Intentionally not memoised: React Query hashes query keys structurally
  // (JSON.stringify with sorted keys — see hashKey in @tanstack/query-core), so
  // a fresh object here yields an identical hash and cannot trigger a refetch
  // loop.
  const filter: ExpenseFilter = cleanEmptyParams({
    from: isValidISODate(fromParam) ? fromParam : undefined,
    to: isValidISODate(toParam) ? toParam : undefined,
    category: categoryParam,
  });

  const summaryOn = firstParam(params.summary) !== "0";
  const hasFilters = isFilterActive(filter);

  const expenseResult = useInfiniteQuery({
    queryKey: expenseKeys.list(filter),
    queryFn: ({ pageParam }) =>
      api().expense.list({ ...filter, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
  });

  const expenses = expenseResult.data?.pages.flatMap((page) => page.data) ?? [];
  const sections = buildSections(expenses);

  const isInitialLoading = expenseResult.isPending && expenses.length === 0;
  const isError = expenseResult.isError && expenses.length === 0;

  return (
    <Screen>
      <FloatingButton href="/(auth)/expense/create" />

      <PendingSyncBadge />

      <ScreenTopBar hasFilters={hasFilters} />

      <ExpenseFilterBar filter={filter} summaryOn={summaryOn} />

      {summaryOn ? <ExpenseTotalBar filter={filter} /> : null}

      <SectionList
        sections={sections}
        keyExtractor={expenseKeyExtractor}
        renderItem={renderExpenseItem}
        renderSectionHeader={({ section }) => (
          <DaySectionHeader label={section.label} total={section.total} />
        )}
        stickySectionHeadersEnabled
        style={styles.list}
        // Clears the absolutely-positioned FAB so the final row can scroll
        // fully into view instead of being permanently half-covered.
        contentContainerStyle={styles.listContent}
        // The FAB lives in the Screen layer above the list, so it isn't a
        // sibling of the scroll view here.
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (expenseResult.hasNextPage && !expenseResult.isFetching) {
            expenseResult.fetchNextPage();
          }
        }}
        ListEmptyComponent={
          <ListPlaceholder
            loading={isInitialLoading}
            error={isError}
            hasFilters={hasFilters}
          />
        }
        ListFooterComponent={
          expenseResult.isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" />
            </View>
          ) : sections.length > 0 && !expenseResult.hasNextPage ? (
            <ThemedText type="caption" style={styles.endOfList}>
              End of list
            </ThemedText>
          ) : null
        }
      />
    </Screen>
  );
}

/** Header strip: title, plus a clear-all shortcut when filters are narrowing. */
function ScreenTopBar(props: { hasFilters: boolean }) {
  const accentColor = useThemeColor({}, "tint");

  return (
    <View style={styles.topBar}>
      {/* Sized down from ThemedText's 32px "title": the total below is the
          content's hero, and a page title louder than it flattens the
          hierarchy. */}
      <ThemedText type="title" style={styles.pageTitle}>
        Expenses
      </ThemedText>

      {props.hasFilters ? (
        <Pressable
          onPress={clearAllFilters}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
        >
          <ThemedText type="small" style={[styles.totalToggle, { color: accentColor }]}>
            Clear filters
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Empty/loading/error slot inside the list.
 *
 * Filters and the total stay mounted while this shows — previously the whole
 * screen was replaced by a spinner on every filter change, which threw away the
 * controls the user had just used and lost their scroll position.
 */
function ListPlaceholder(props: {
  loading: boolean;
  error: boolean;
  hasFilters: boolean;
}) {
  // Before the early returns below — hooks must run unconditionally.
  const accentColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "borderColor");

  if (props.loading) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator size="large" />
        <ThemedText type="caption" style={styles.placeholderText}>
          Loading expenses…
        </ThemedText>
      </View>
    );
  }

  if (props.error) {
    return (
      <View style={styles.placeholder}>
        <ThemedText type="muted" style={styles.placeholderText}>
          Could not load your expenses. Pull down to retry.
        </ThemedText>
      </View>
    );
  }

  // Distinguish "you have no expenses yet" from "your filter matched nothing" —
  // they need different actions, and conflating them leaves the user staring at
  // a blank screen with no idea which case they're in.
  return (
    <View style={styles.placeholder}>
      <ThemedText type="defaultSemiBold" style={styles.placeholderTitle}>
        {props.hasFilters ? "No matching expenses" : "No expenses yet"}
      </ThemedText>
      <ThemedText type="caption" style={styles.placeholderText}>
        {props.hasFilters
          ? "Try a wider date range or clear your filters."
          : "Tap + to log your first expense."}
      </ThemedText>

      {props.hasFilters ? (
        <Pressable
          onPress={clearAllFilters}
          // Outline rather than a filled pill. Previously this used the `tint`
          // token, which is #ffffff in dark mode — a floating white blob with
          // near-invisible text. An outline recedes until tapped.
          style={[styles.placeholderAction, { borderColor }]}
          accessibilityRole="button"
        >
          <ThemedText
            type="defaultSemiBold"
            style={[styles.placeholderActionText, { color: accentColor }]}
          >
            Clear filters
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
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
        title={props.expense.description ?? "Untitled expense"}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: PicoThemeVariables.spacing,
  },
  pageTitle: {
    // ThemedText's "title" is 32px/bold, which visually outweighs the total it
    // should be framing. 24px keeps it clearly a page header.
    fontSize: 24,
    lineHeight: 30,
  },
  filterBar: {
    // Pins the row to its content height. Without this the horizontal
    // ScrollView's flexGrow: 1 base style absorbs spare vertical space and
    // leaves a large gap before the content.
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: PicoThemeVariables.spacing,
  },
  filterScroller: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterBarContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Bleed to the screen edge so a partially visible chip still reads as
    // scrollable rather than as a clipped layout bug.
    paddingRight: PicoThemeVariables.spacing,
  },
  totalBar: {
    borderRadius: PicoThemeVariables.borderRadius,
    borderWidth: PicoThemeVariables.borderWidth,
    paddingHorizontal: PicoThemeVariables.spacing,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: PicoThemeVariables.spacing,
  },
  totalStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalLabel: {
    marginBottom: 2,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  totalAmount: {
    // Hero, but deliberately under the page title's former weight so the two
    // don't compete.
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
  },
  totalCount: {
    flexShrink: 1,
  },
  totalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
  },
  totalCaption: {
    flex: 1,
  },
  totalToggle: {
    fontWeight: "600",
  },
  pendingTotal: {
    marginTop: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    // Clears the FAB (56px tall, offset 35px from the bottom) so the last row
    // can scroll fully clear instead of resting permanently behind it.
    paddingBottom: 120,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pendingRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: PicoThemeVariables.spacing,
  },
  placeholderTitle: {
    marginBottom: 4,
  },
  placeholderText: {
    textAlign: "center",
  },
  placeholderAction: {
    marginTop: PicoThemeVariables.spacing,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: PicoThemeVariables.borderRadius,
    borderWidth: PicoThemeVariables.borderWidth,
    backgroundColor: "transparent",
  },
  placeholderActionText: {
    // Colour applied inline via the theme's tint token.
  },
  footerLoader: {
    paddingVertical: PicoThemeVariables.spacing,
  },
  endOfList: {
    textAlign: "center",
    paddingVertical: PicoThemeVariables.spacing,
  },
});
