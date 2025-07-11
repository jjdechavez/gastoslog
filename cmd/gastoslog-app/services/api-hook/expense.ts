import {
  useInfiniteQuery,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import {
  buildOptions,
  queryKeysFactory,
  UseQueryOptionsWrapper,
} from "@/services/query";
import { ListMeta } from "@/types/api";
import type { Expense, ExpenseInput, ListExpense } from "@/types/expense";

const EXPENSE_QUERY_KEY = `expenses` as const;

export const expenseKeys = queryKeysFactory(EXPENSE_QUERY_KEY);

type ExpensesQueryKey = typeof expenseKeys;

export const useInfiniteExpenses = (
  query?: Partial<ListMeta>,
  options?: UseInfiniteQueryOptions<
    ListExpense,
    Error,
    ReturnType<ExpensesQueryKey["list"]>
  >,
) => {
  return useInfiniteQuery({
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
    ...options,
  });
};

export const useCreateExpense = (
  options?: UseMutationOptions<Expense, Error, ExpenseInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => api().expense.create(input),
    ...buildOptions(queryClient, [expenseKeys.lists()], options),
  });
};

export const useExpense = (
  expenseId: string,
  options?: UseQueryOptionsWrapper<
    { data: Expense },
    Error,
    ReturnType<ExpensesQueryKey["detail"]>
  >,
) => {
  return useQuery({
    queryKey: expenseKeys.detail(expenseId),
    queryFn: () => api().expense.detail(expenseId),
    ...options,
  });
};

export const useUpdateExpense = (
  expenseId: string,
  options?: UseMutationOptions<{ data: Expense }, Error, ExpenseInput>,
) => {
  const queryClient = useQueryClient();
  const { data, ...rest } = useMutation({
    mutationFn: (input: ExpenseInput) => api().expense.update(expenseId, input),
    ...buildOptions(
      queryClient,
      [expenseKeys.lists(), expenseKeys.detail(expenseId)],
      options,
    ),
  });
  return { data: data?.data, ...rest };
};
