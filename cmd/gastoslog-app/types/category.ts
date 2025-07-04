import { z } from "zod/v4";
import { ListMeta } from "./api";

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

