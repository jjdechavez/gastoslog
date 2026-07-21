// Leaf module (imports nothing) holding offline mutation keys.
//
// Kept separate from mutation-defaults.ts so that services/api-hook/expense.ts
// can reference the key without importing mutation-defaults.ts — which in turn
// imports expense.ts for `expenseKeys`. That mutual import was a require cycle
// (mutation-defaults -> expense -> mutation-defaults) and could surface as an
// uninitialized value at module-eval time. A key is just data, so it lives
// here with zero dependencies and every consumer imports it from one place.
export const EXPENSE_CREATE_MUTATION_KEY = ["expenses", "create"] as const;

// Same rationale as EXPENSE_CREATE_MUTATION_KEY above: shared between
// mutation-defaults.ts (setMutationDefaults) and useCreateCategory
// (mutationKey) so a paused/persisted "create category" mutation can be
// matched back up to its mutationFn/onMutate/onSettled after a cold restart.
export const CATEGORY_CREATE_MUTATION_KEY = ["categories", "create"] as const;

// Same rationale as EXPENSE_CREATE_MUTATION_KEY above: shared between
// mutation-defaults.ts (setMutationDefaults) and useCreateTarget
// (mutationKey) so a paused/persisted "create target" mutation can be
// matched back up to its mutationFn/onMutate/onSettled after a cold restart.
export const TARGET_CREATE_MUTATION_KEY = ["targets", "create"] as const;

// Same rationale as EXPENSE_CREATE_MUTATION_KEY above: shared between
// mutation-defaults.ts (setMutationDefaults) and useCreateTargetLog
// (mutationKey) so a paused/persisted "create target log" mutation can be
// matched back up to its mutationFn/onMutate/onSettled after a cold restart.
export const TARGET_LOG_CREATE_MUTATION_KEY = ["targetLogs", "create"] as const;
