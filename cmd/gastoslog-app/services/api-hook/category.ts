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
  UpdateCategoryInput,
  NewCategory,
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
  const { data, ...rest } = useQuery({
    queryKey: categoryKeys.list(query),
    queryFn: () => api().category.list(),
    ...options,
  });
  return { ...data, ...rest } as const;
};

export const useCreateCategory = (
  options?: UseMutationOptions<Category, Error, NewCategory>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCategory) => api().category.create(input),
    ...buildOptions(queryClient, [categoryKeys.lists()], options),
  });
};

export const useUpdateCategory = (
  categoryId: string,
  options?: UseMutationOptions<Category, Error, UpdateCategoryInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => api().category.update(input),
    ...buildOptions(
      queryClient,
      [categoryKeys.lists(), categoryKeys.detail(categoryId)],
      options,
    ),
  });
};
