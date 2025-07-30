import { Category, CategoryInput, ListCategory } from "@/types/category";
import { request } from "./request";
import {
  Expense,
  ExpenseInput,
  ExpenseOverviewQuery,
  ExpenseOverviewResponse,
  ListExpense,
} from "@/types/expense";
import { ListMeta } from "@/types/api";

const V1 = "/v1" as const;

export const DEFAULT_PAGE_INDEX = 1;
export const DEFAULT_PAGE_SIZE = 10;

export const cleanEmptyParams = <T extends Record<string, unknown>>(
  search: T,
) => {
  const newSearch = { ...search };
  Object.keys(newSearch).forEach((key) => {
    const value = newSearch[key];
    if (
      value === undefined ||
      value === "" ||
      (typeof value === "number" && isNaN(value))
    )
      delete newSearch[key];
  });

  if (search.page === DEFAULT_PAGE_INDEX) delete newSearch.page;
  if (search.limit === DEFAULT_PAGE_SIZE) delete newSearch.limit;

  return newSearch;
};

export function getSearchParams(params: Record<string, any>) {
  const serializeParams = cleanEmptyParams(params);
  const urlSearchParams = new URLSearchParams(serializeParams);

  return urlSearchParams.toString().length === 0
    ? urlSearchParams.toString()
    : `?${urlSearchParams.toString()}`;
}

export const api = (version = V1) => {
  return {
    auth: {
      signIn: async (email: string, password: string) => {
        return await request<{ token: string; refresh_token: string }>(
          `${version}/auth/sign-in`,
          {
            method: "POST",
            body: { email, password },
          },
        );
      },
      signUp: async (username: string, password: string) => {
        return await request<{ message: string; token: string }>(
          `${version}/auth/sign-up`,
          {
            method: "POST",
            body: { username, password },
          },
        );
      },
      signOut: async () => {
        return await request(`${version}/auth/logout`, {
          method: "POST",
        });
      },
      me: async () => {
        return await request(`${version}/auth/me`, {
          method: "GET",
        });
      },
    },
    category: {
      list: async (query?: ListMeta) => {
        const searchParams = getSearchParams(query || {});
        return await request<ListCategory>(
          `${version}/categories${searchParams}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
      },
      detail: async (categoryId: string) => {
        return await request<{ data: Category }>(
          `${version}/categories/${categoryId}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
      },
      create: async (input: CategoryInput) => {
        return await request(`${version}/categories`, {
          method: "POST",
          body: input,
        });
      },
      update: async (categoryId: string, input: CategoryInput) => {
        return await request<{ data: Category }>(
          `${version}/categories/${categoryId}`,
          {
            method: "POST",
            body: { name: input.name, description: input.description },
          },
        );
      },
      delete: async (categoryId: number) => {
        return await request(`${version}/categories/${categoryId}`, {
          method: "DELETE",
        });
      },
    },
    expense: {
      list: async (query?: Partial<ListMeta>) => {
        const searchParams = getSearchParams(query || {});
        return await request<ListExpense>(
          `${version}/expenses${searchParams}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
      },
      overview: async (query: ExpenseOverviewQuery = { period: "today" }) => {
        const params = new URLSearchParams();
        params.append("period", query.period);
        if (query?.date) {
          params.append("date", query.date);
        }

        return await request<ExpenseOverviewResponse>(
          `${version}/expenses/overview?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
      },
      create: async (input: ExpenseInput) => {
        return await request(`${version}/expenses`, {
          method: "POST",
          body: input,
        });
      },
      detail: async (expenseId: string) => {
        return await request<{ data: Expense }>(
          `${version}/expenses/${expenseId}`,
          {
            method: "GET",
            credentials: "include",
          },
        );
      },
      update: async (expenseId: string, input: ExpenseInput) => {
        return await request<{ data: Expense }>(
          `${version}/expenses/${expenseId}`,
          {
            method: "POST",
            body: {
              amount: input.amount,
              categoryId: input.categoryId,
              description: input.description,
            },
          },
        );
      },
      delete: async (expenseId: string) => {
        return await request(`${version}/expenses/${expenseId}`, {
          method: "DELETE",
        });
      },
    },
  };
};
