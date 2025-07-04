import { z } from "zod/v4";
import { CategorySchema, ListResponse } from "./category";

export const ExpenseSchema = z.object({
  id: z.number().nonnegative(),
  amount: z.coerce
    .number({ error: "Amount is required" })
    .positive()
    .min(1, { error: "Minimum 1" }),
  description: z.string().optional().nullable(),
  createdAt: z.iso.date(),
  updatedAt: z.date(),
  categoryId: CategorySchema.shape.id,
  category: CategorySchema,
});

export type Expense = z.infer<typeof ExpenseSchema>;

export type ListExpense = ListResponse<Expense>;

export type ExpenseOverviewResponse = {
  data: Array<{
    categoryId: number;
    categoryName: string;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
  meta: {
    period: string;
    totalAmount: number;
    totalCount: number;
  };
};

export const ExpenseInputSchema = ExpenseSchema.omit({
  id: true,
  category: true,
  createdAt: true,
  updatedAt: true,
});

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>;
