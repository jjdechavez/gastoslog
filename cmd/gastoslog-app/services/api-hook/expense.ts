import { useQuery } from "@tanstack/react-query";

import { api, ListExpense, ListMeta } from "@/services/api";
import { queryKeysFactory, UseQueryOptionsWrapper } from "@/services/query";

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
