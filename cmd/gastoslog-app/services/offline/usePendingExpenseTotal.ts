import { useMutationState } from "@tanstack/react-query";

import { EXPENSE_CREATE_MUTATION_KEY } from "@/services/offline/mutation-keys";
import type { ExpenseInput } from "@/types/expense";

export type PendingExpenseTotal = {
  /** Sum of queued expense amounts, in cents. */
  amount: number;
  count: number;
};

/**
 * Total of expenses that exist only on this device (queued to sync).
 *
 * The server-side summary can't see these — they have no id yet — so without
 * this the displayed total would be quietly low right after an offline create.
 * Surfacing them as a separate, explicitly-labelled addend keeps the server
 * number honest instead of quietly fudging it.
 */
export function usePendingExpenseTotal(): PendingExpenseTotal {
  // `select` is handed the Mutation itself (not its state), so the variables
  // live under `.state` — same shape PendingSyncBadge relies on. A paused
  // mutation (waiting out being offline) still reports status "pending", so
  // this covers both queued-and-waiting and in-flight writes.
  const pending = useMutationState({
    filters: { mutationKey: EXPENSE_CREATE_MUTATION_KEY, status: "pending" },
    select: (mutation) =>
      (mutation.state.variables as ExpenseInput | undefined)?.amount,
  });

  const amount = pending.reduce<number>((total, value) => {
    // ExpenseInput.amount is the raw form value in pesos; the stored/displayed
    // value is cents (the server multiplies by 100 on create).
    if (typeof value !== "number" || Number.isNaN(value)) return total;
    return total + Math.round(value * 100);
  }, 0);

  return { amount, count: pending.length };
}