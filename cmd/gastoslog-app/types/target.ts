import { z } from "zod/v4";
import { ListResponse } from "./api";

export const TargetSchema = z.object({
  id: z.number().nonnegative(),
  name: z.string().min(3).max(255),
  targetAmount: z.number(),
  paidAmount: z.number(),
  type: z.enum(["savings", "debt", "loan"]),
  direction: z.enum(["inbound", "outbound"]),
  status: z.enum(["active", "completed", "cancelled"]),
  deadlineAt: z.date().optional(),
  createdAt: z.iso.date(),
  updatedAt: z.iso.date(),
});

export type Target = z.infer<typeof TargetSchema>;

export type ListTarget = ListResponse<Target>;

export const TargetInputSchema = TargetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  paidAmount: true,
}).extend({
  targetAmount: z.coerce
    .number({ error: "Target amount is required" })
    .positive()
    .min(1, { error: "Minimum 1" }),
  deadlineAt: z.string().optional(),
});

export type TargetInput = z.infer<typeof TargetInputSchema>;

export const TargetLogSchema = z.object({
  id: z.number().nonnegative(),
  targetId: z.number(),
  amount: z.number(),
  notes: z.string().optional(),
  entryDate: z.iso.date(),
  createdAt: z.iso.date(),
  updatedAt: z.iso.date(),
});

export type TargetLog = z.infer<typeof TargetLogSchema>;

export type ListTargetLog = ListResponse<TargetLog>;

export const TargetLogInputSchema = TargetLogSchema.omit({
  id: true,
  targetId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce
    .number({ error: "Amount is required" })
    .positive()
    .min(1, { error: "Minimum 1" }),
  entryDate: z.string({ error: "Entry date is required" }),
});

export type TargetLogInput = z.infer<typeof TargetLogInputSchema>;
