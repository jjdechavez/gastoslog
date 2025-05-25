import { request } from "./request";

const V1 = "/v1" as const;

export type ListMeta = {
  page: number;
  limit: number;
};

export type Category = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListCategory = {
  category: Array<Category>;
  meta: ListMeta;
};

export type CreateCategoryInput = {
  name: string;
  description?: string;
};

export type UpdateCategoryInput = CreateCategoryInput & { categoryId: number };

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
      create: async (input: CreateCategoryInput) => {
        return await request(`${version}/categories`, {
          method: "POST",
          body: input,
        });
      },
      update: async (input: UpdateCategoryInput) => {
        return await request(`${version}/categories/${input.categoryId}`, {
          method: "POST",
          body: { name: input.name, description: input.description },
        });
      },
      delete: async (categoryId: number) => {
        return await request(`${version}/categories/${categoryId}`, {
          method: "DELETE",
        });
      },
    },
  };
};
