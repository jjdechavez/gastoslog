import { FlatList, StyleSheet } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/ui/SearchBar";
import { Separator } from "@/components/Separator";
import { Screen } from "@/components/Screen";
import { Alert } from "@/components/Alert";
import { FloatingButton } from "@/components/FloatingButton";
import { ScreenState, ListFooterLoader } from "@/components/ScreenState";
import { categoryKeys } from "@/services/api-hook/category";
import { api } from "@/services/api";

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

        {status === "success" && (
          <FlatList
            data={data.pages.flatMap((page) => page.data) || []}
            renderItem={({ item }) => (
              <Link href={`/(auth)/category/${item.id}/edit`} asChild push>
                <ThemedText style={styles.item}>{item.name}</ThemedText>
              </Link>
            )}
            ListFooterComponent={() => (
              <ListFooterLoader loading={isFetchingNextPage} />
            )}
          />
        )}
      </ScreenState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 10,
    fontSize: 18,
    height: 55,
  },
});
