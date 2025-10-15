import { api } from "@/services/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import Select, { type SelectItem } from "./Select";
import { ThemedText } from "./ThemedText";

type SelectCategoryProps = {
  value?: number | null;
  onChange?: (item: SelectItem | null) => void;
  isLoading?: boolean;
};

export function SelectCategory(props: SelectCategoryProps) {
  const { value, onChange } = props;
  const {
    data,
    isLoading: isLoadingCategories,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ["categories-infinite"],
    queryFn: ({ pageParam }) =>
      api().category.list({ page: pageParam as number, limit: 100 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
  });

  const mapped = useMemo(() => {
    if (!data?.pages) return { pages: [] as SelectItem[][] };
    return {
      pages: data.pages.map((page) =>
        (page?.data ?? []).map((cat: any) => ({
          id: cat.id,
          label: cat.name,
          value: cat.id,
        })),
      ),
    } as { pages: SelectItem[][] };
  }, [data]);

  return (
    <Select
      value={value ?? null}
      onChange={(item) => {
        onChange?.(item);
      }}
      data={mapped}
      isLoading={props.isLoading || isLoadingCategories}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={!!hasNextPage}
      fetchNextPage={fetchNextPage}
      error={error}
      placeholder="Select a category"
      renderEmpty={() => <ThemedText>No results</ThemedText>}
      renderError={() => <ThemedText>Failed to load</ThemedText>}
    />
  );
}
