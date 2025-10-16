import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import {
  buildOptions,
  queryKeysFactory,
  UseQueryOptionsWrapper,
} from "@/services/query";
import type {
  Expense,
  ExpenseInput,
  ExpenseOverviewQuery,
  ExpenseOverviewResponse,
} from "@/types/expense";

const EXPENSE_QUERY_KEY = `expenses` as const;

export const expenseKeys = queryKeysFactory(EXPENSE_QUERY_KEY);

type ExpensesQueryKey = typeof expenseKeys;

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

export const useOverviewExpense = (
  query: ExpenseOverviewQuery,
  options?: UseQueryOptionsWrapper<ExpenseOverviewResponse, Error>,
) => {
  return useQuery({
    queryKey: ["expense", "overview", query],
    queryFn: () => api().expense.overview(query),
    ...options,
  });
};

export const useDeleteExpense = (
  expenseId: string,
  options?: UseMutationOptions<void, Error>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api().expense.delete(expenseId),
    ...buildOptions(
      queryClient,
      [expenseKeys.lists(), expenseKeys.detail(expenseId)],
      options,
    ),
  });
};
