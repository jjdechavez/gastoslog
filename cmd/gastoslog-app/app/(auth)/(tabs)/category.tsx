import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SearchBar } from "@/components/ui/SearchBar";
import { Separator } from "@/components/Separator";
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
import { categoryKeys } from "@/services/api-hook/category";
import { api } from "@/services/api";

export default function CategoryScreen() {
  const params = useLocalSearchParams();
  const query = {
    limit: 100,
    s: params.s as string,
  };

  const { data, status, isFetchingNextPage } = useInfiniteQuery({
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

  const handleSearch = (value: string) => {
    const prevSearch = (params?.s as string) || "";
    if (value && value !== "") {
      router.setParams({ s: prevSearch + value });
    } else {
      router.setParams({ s: undefined });
    }
  };

  if (status === "pending") {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Loading</ThemedText>
      </ThemedView>
    );
  }

  if (status === "error") {
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

      <SearchBar value={params.s as string} onSearch={handleSearch} />

      <Separator />

      <FloatingButton>
        <Link href="/(auth)/category/create" asChild push>
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
        data={data.pages.flatMap((page) => page.data) || []}
        renderItem={({ item }) => (
          <Link href={`/(auth)/category/${item.id}/edit`} asChild push>
            <ThemedText style={styles.item}>{item.name}</ThemedText>
          </Link>
        )}
        ListFooterComponent={() => {
          if (isFetchingNextPage) {
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
    padding: 10,
    fontSize: 18,
    height: 55,
  },
});
