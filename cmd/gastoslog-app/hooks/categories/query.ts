import { useQuery } from "@tanstack/react-query";

import { api, ListCategory, ListMeta } from "@/services/api";
import { queryKeysFactory, UseQueryOptionsWrapper } from "@/services/query";

const CATEGORY_QUERY_KEY = `categories` as const;

export const categoryKeys = queryKeysFactory(CATEGORY_QUERY_KEY);

type CategoriesQueryKey = typeof categoryKeys;

export const useCategories = (
  query?: ListMeta,
  options?: UseQueryOptionsWrapper<
    ListCategory,
    Error,
    ReturnType<CategoriesQueryKey["list"]>
  >,
) => {
  const { data, ...rest } = useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: () => api().category.list(),
    ...options,
  });
  return { ...data, ...rest } as const;
};
