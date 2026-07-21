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
import { EXPENSE_CREATE_MUTATION_KEY } from "@/services/offline/mutation-keys";
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
  // mutationFn + the optimistic onMutate/onSettled pair come from the
  // mutationDefaults registered in app/_layout.tsx (keyed by
  // EXPENSE_CREATE_MUTATION_KEY) — this is what lets a mutation paused
  // offline resume correctly after a cold restart, since react-query can't
  // persist functions, only the key. `options` (onSuccess/onError from the
  // create screen) is spread last so it layers on top: react-query does NOT
  // deep-merge same-named callbacks between defaults and options (options
  // wins), but onSuccess/onError are different callback names than
  // onMutate/onSettled, so both sets run without clashing.
  return useMutation({
    mutationKey: EXPENSE_CREATE_MUTATION_KEY,
    ...options,
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
