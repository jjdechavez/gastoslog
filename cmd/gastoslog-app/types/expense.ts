import { z } from "zod/v4";
import { CategorySchema } from "./category";
import { ListResponse } from "./api";

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

/**
 * The filters that scope both the expense list and its total.
 *
 * `from`/`to` are inclusive `YYYY-MM-DD` bounds; either may be omitted to leave
 * that end open. `category` is a comma-separated id list because that is what
 * the API accepts — huma parses `[]int64` query params from one comma-separated
 * value, and silently keeps only the first if the param is repeated (see the
 * note on `ExpenseSummaryInput.Category` in internal/api/v1/expense_handler.go).
 *
 * Deliberately carries no `page`/`limit`: a total that depended on which page
 * was loaded would change as the user scrolls.
 */
export type ExpenseFilter = {
  from?: string;
  to?: string;
  category?: string;
};

/** Aggregate over a set of expenses. `totalAmount` is in cents. */
export type ExpenseTotal = {
  totalAmount: number;
  totalCount: number;
};

export const expensePeriod = ["today", "month", "year"] as const;
export type Period = (typeof expensePeriod)[number];

export type ExpenseOverviewQuery = {
  period: Period;
  date?: string;
};
