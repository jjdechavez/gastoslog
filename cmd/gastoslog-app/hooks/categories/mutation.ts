import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";

import { api, Category, UpdateCategoryInput } from "@/services/api";
import { buildOptions } from "@/services/query";
import { categoryKeys } from "./query";

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
