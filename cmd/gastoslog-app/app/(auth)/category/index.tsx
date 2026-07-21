import { FlatList, StyleSheet, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/ui/SearchBar";
import { Separator } from "@/components/Separator";
import { Screen } from "@/components/Screen";
import { Alert } from "@/components/Alert";
import { FloatingButton } from "@/components/FloatingButton";
import { PendingSyncBadge } from "@/components/PendingSyncBadge";
import { PendingTag } from "@/components/PendingTag";
import { ScreenState, ListFooterLoader } from "@/components/ScreenState";
import { categoryKeys } from "@/services/api-hook/category";
import { CATEGORY_CREATE_MUTATION_KEY } from "@/services/offline/mutation-keys";
import { api } from "@/services/api";
import type { Category } from "@/types/category";

export default function CategoryScreen() {
  const params = useLocalSearchParams();
  const query = {
    limit: 100,
    s: params.s as string,
  };

  const queryResult = useInfiniteQuery({
    queryKey: categoryKeys.list(query),
    queryFn: ({ pageParam }) =>
      api().category.list({ ...query, page: pageParam as number }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
  });
  const { data, status, isFetchingNextPage } = queryResult;

  const handleSearch = (value: string) => {
    const prevSearch = (params?.s as string) || "";
    if (value && value !== "") {
      router.setParams({ s: prevSearch + value });
    } else {
      router.setParams({ s: undefined });
    }
  };

  return (
    <Screen>
      <ScreenState query={queryResult}>
        {params.success ? (
          <Alert type="success" message={params.success as string} />
        ) : null}

        <SearchBar value={params.s as string} onSearch={handleSearch} />

        <Separator />

        <FloatingButton href="/(auth)/category/create" />

        <PendingSyncBadge
          mutationKey={CATEGORY_CREATE_MUTATION_KEY}
          nounSingular="category"
          nounPlural="categories"
        />

        {status === "success" && (
          <FlatList
            data={data.pages.flatMap((page) => page.data) || []}
            renderItem={({ item }) => <CategoryItem category={item} />}
            ListFooterComponent={() => (
              <ListFooterLoader loading={isFetchingNextPage} />
            )}
          />
        )}
      </ScreenState>
    </Screen>
  );
}

type CategoryItemProps = {
  category: Category;
};

function CategoryItem({ category }: CategoryItemProps) {
  // Optimistic rows use a negative temp id (see
  // services/offline/mutation-defaults.ts) and can't be opened for edit yet —
  // no server id exists until the create mutation resolves and the list is
  // invalidated/refetched.
  const isOptimistic = category.id < 0;

  if (isOptimistic) {
    return (
      <View style={styles.itemRow}>
        <ThemedText style={styles.itemText}>{category.name}</ThemedText>
        <PendingTag />
      </View>
    );
  }

  return (
    <Link href={`/(auth)/category/${category.id}/edit`} asChild push>
      <ThemedText style={styles.item}>{category.name}</ThemedText>
    </Link>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 10,
    fontSize: 18,
    height: 55,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 55,
  },
  itemText: {
    fontSize: 18,
  },
});
