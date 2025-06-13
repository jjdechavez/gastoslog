import { z } from "zod/v4";
import { request } from "./request";

const V1 = "/v1" as const;

export type ListMeta = {
  page: number;
  limit: number;
};

export const CategorySchema = z.object({
  id: z.number().nonnegative(),
  name: z
    .string({ error: "Name is required" })
    .min(2, { error: "Minimum 2 text" })
    .max(255, { error: "Maximum 255 text" }),
  description: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CategoryInputSchema = CategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export type ListResponse<T> = {
  data: Array<T>;
  meta: ListMeta;
};

export type ListCategory = ListResponse<Category>;

export type CreateCategoryInput = {
  name: string;
  description?: string;
};

export const ExpenseSchema = z.object({
  id: z.number().nonnegative(),
  amount: z.int({ error: "Amount is required" }).min(1, { error: "Minimum 1" }),
  description: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  categoryId: CategorySchema.shape.id,
  category: CategorySchema,
});

export type Expense = z.infer<typeof ExpenseSchema>;

export type ListExpense = ListResponse<Expense>;

export const api = (version = V1) => {
  return {
    auth: {
      signIn: async (email: string, password: string) => {
        return await request<{ token: string }>(`${version}/auth/sign-in`, {
          method: "POST",
          body: { email, password },
        });
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
      list: async () => {
        return await request<ListCategory>(`${version}/categories`, {
          method: "GET",
          credentials: "include",
        });
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
      list: async () => {
        return await request<ListExpense>(`${version}/expenses`, {
          method: "GET",
          credentials: "include",
        });
      },
    },
  };
};
