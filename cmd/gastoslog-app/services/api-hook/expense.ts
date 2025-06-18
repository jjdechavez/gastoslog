import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  api,
  Expense,
  ExpenseInput,
  ListExpense,
  ListMeta,
} from "@/services/api";
import {
  buildOptions,
  queryKeysFactory,
  UseQueryOptionsWrapper,
} from "@/services/query";

const EXPENSE_QUERY_KEY = `expenses` as const;

export const expenseKeys = queryKeysFactory(EXPENSE_QUERY_KEY);

type ExpensesQueryKey = typeof expenseKeys;

export const useExpenses = (
  query?: ListMeta,
  options?: UseQueryOptionsWrapper<
    ListExpense,
    Error,
    ReturnType<ExpensesQueryKey["list"]>
  >,
) => {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: () => api().expense.list(),
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
