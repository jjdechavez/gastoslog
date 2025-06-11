import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

import {
  api,
  ListCategory,
  ListMeta,
  Category,
  CategoryInput,
} from "@/services/api";
import { queryKeysFactory, UseQueryOptionsWrapper } from "@/services/query";
import { buildOptions } from "@/services/query";

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
  return useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: () => api().category.list(),
    ...options,
  });
};

export const useCategory = (
  categoryId: string,
  options?: UseQueryOptionsWrapper<
    { data: Category },
    Error,
    ReturnType<CategoriesQueryKey["detail"]>
  >,
) => {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId.toString()),
    queryFn: () => api().category.detail(categoryId),
    ...options,
  });
};

export const useCreateCategory = (
  options?: UseMutationOptions<Category, Error, CategoryInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => api().category.create(input),
    ...buildOptions(queryClient, [categoryKeys.lists()], options),
  });
};

export const useUpdateCategory = (
  categoryId: string,
  options?: UseMutationOptions<{ data: Category }, Error, CategoryInput>,
) => {
  const queryClient = useQueryClient();
  const { data, ...rest } = useMutation({
    mutationFn: (input: CategoryInput) =>
      api().category.update(categoryId, input),
    ...buildOptions(
      queryClient,
      [categoryKeys.lists(), categoryKeys.detail(categoryId.toString())],
      options,
    ),
  });
  return { data: data?.data, ...rest };
};
