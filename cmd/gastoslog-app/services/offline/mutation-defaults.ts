import {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import { expenseKeys } from "@/services/api-hook/expense";
import { categoryKeys } from "@/services/api-hook/category";
import { targetKeys, targetLogKeys } from "@/services/api-hook/target";
import type { CreateTargetLogVariables } from "@/services/api-hook/target";
import {
  CATEGORY_CREATE_MUTATION_KEY,
  EXPENSE_CREATE_MUTATION_KEY,
  TARGET_CREATE_MUTATION_KEY,
  TARGET_LOG_CREATE_MUTATION_KEY,
} from "@/services/offline/mutation-keys";
import type { Category, CategoryInput, ListCategory } from "@/types/category";
import type { Expense, ExpenseInput, ListExpense } from "@/types/expense";
import type {
  ListTarget,
  ListTargetLog,
  Target,
  TargetInput,
  TargetLog,
} from "@/types/target";

// KNOWN v1 LIMITATION — at-least-once delivery, not exactly-once:
// the create mutation (via retry + resumePausedMutations) may re-send a
// request whose earlier attempt actually succeeded on the server but whose
// response never made it back to the client (e.g. connection drops right
// after the server commits the write, or the app is killed mid-request).
// react-query has no way to know the write already happened, so it retries
// and the backend — which has no idempotency key for expense creation —
// happily creates a second row, producing a visible duplicate. Accepted for
// v1. Future fix: have the client attach a `client_uuid` per create attempt
// and have the backend dedupe on it (upsert-by-uuid instead of insert).
//
// EXPENSE_CREATE_MUTATION_KEY (imported above from the dependency-free
// mutation-keys.ts) is shared between here (setMutationDefaults) and
// useCreateExpense (mutationKey) so a persisted, paused mutation restored after
// a cold start can be matched back up to this mutationFn/onMutate/onSettled
// trio — react-query cannot serialize functions, only the key, so the defaults
// MUST be re-registered before any paused mutation is resumed.

type CreateExpenseContext = {
  previous: Array<[QueryKey, unknown]>;
  tempId: number;
};

// Builds a placeholder category so the optimistic row always has something
// to render, even if the categories list hasn't been fetched/cached yet.
function findCachedCategory(
  queryClient: QueryClient,
  categoryId: number,
): Category {
  const cachedLists = queryClient.getQueriesData<ListCategory>({
    queryKey: categoryKeys.lists(),
  });

  for (const [, data] of cachedLists) {
    const found = data?.data?.find((category) => category.id === categoryId);
    if (found) {
      return found;
    }
  }

  const now = new Date();
  return {
    id: categoryId,
    name: "…",
    description: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Registers the mutationFn + optimistic update logic for the "create
// expense" mutation, keyed by EXPENSE_CREATE_MUTATION_KEY. Must be called at
// app startup (before the persisted cache is restored) so that a mutation
// which was paused offline and persisted across a cold restart has a
// mutationFn to resume with.
export function registerMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults<
    Expense,
    Error,
    ExpenseInput,
    CreateExpenseContext
  >(EXPENSE_CREATE_MUTATION_KEY, {
    mutationFn: (input) => api().expense.create(input) as Promise<Expense>,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.lists() });

      // Snapshot every matching list query so we can roll back on a real
      // failure (a pause while offline does not trigger onError).
      const previous = queryClient.getQueriesData({
        queryKey: expenseKeys.lists(),
      });

      // Negative + timestamp-based so it never collides with a real
      // (positive) server id, and `id < 0` doubles as the "optimistic" check.
      const tempId = -Date.now();
      const now = new Date().toISOString();

      const optimisticExpense: Expense & { __optimistic: true } = {
        id: tempId,
        // input.amount is the raw form value in PESOS, but Expense.amount is
        // stored/displayed in CENTS everywhere (the server multiplies by 100
        // on create and returns cents; <Amount> divides by 100). Mirror that
        // conversion here so the optimistic row shows the same value as the
        // real server row it's replaced by after sync — otherwise it renders
        // 100x too small.
        amount: Math.round(input.amount * 100),
        description: input.description ?? null,
        createdAt: now,
        updatedAt: new Date(),
        categoryId: input.categoryId,
        category: findCachedCategory(queryClient, input.categoryId),
        __optimistic: true,
      };

      queryClient.setQueriesData<InfiniteData<ListExpense>>(
        { queryKey: expenseKeys.lists() },
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) {
            return old;
          }

          const [firstPage, ...restPages] = old.pages;
          return {
            ...old,
            pages: [
              { ...firstPage, data: [optimisticExpense, ...firstPage.data] },
              ...restPages,
            ],
          };
        },
      );

      return { previous, tempId };
    },
    onError: (_err, _input, context) => {
      // Only reached on a real failure — a pause while offline resolves via
      // resumePausedMutations() later and skips onError entirely.
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      // On success this refetches and the temp row is replaced by the real
      // server row. Harmless while offline — it just marks the queries stale
      // for the next time they're fetched.
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["expense", "overview"] });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  registerCategoryCreateDefaults(queryClient);
  registerTargetCreateDefaults(queryClient);
  registerTargetLogCreateDefaults(queryClient);
}

type CreateCategoryContext = {
  previous: Array<[QueryKey, unknown]>;
};

// Registers the mutationFn + optimistic update logic for the "create
// category" mutation, keyed by CATEGORY_CREATE_MUTATION_KEY. Mirrors the
// expense registration above; called from registerMutationDefaults so a
// single import-time side effect (see query-client.ts) registers both.
function registerCategoryCreateDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults<
    Category,
    Error,
    CategoryInput,
    CreateCategoryContext
  >(CATEGORY_CREATE_MUTATION_KEY, {
    mutationFn: (input) => api().category.create(input) as Promise<Category>,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() });

      // Snapshot every matching list query so we can roll back on a real
      // failure (a pause while offline does not trigger onError).
      const previous = queryClient.getQueriesData({
        queryKey: categoryKeys.lists(),
      });

      // Negative + timestamp-based so it never collides with a real
      // (positive) server id, and `id < 0` doubles as the "optimistic" check.
      const tempId = -Date.now();
      const now = new Date();

      const optimisticCategory: Category & { __optimistic: true } = {
        id: tempId,
        name: input.name,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
        __optimistic: true,
      };

      // Unlike expenses, the categories list cache is stored under
      // categoryKeys.lists() in TWO different shapes depending on the
      // consumer: useCategories() stores a plain ListCategory
      // ({ data, meta }), while SelectCategory stores an
      // InfiniteData<ListCategory> ({ pages: [{data,meta}], pageParams }).
      // Handle both so the optimistic row appears wherever it's cached.
      queryClient.setQueriesData<InfiniteData<ListCategory> | ListCategory>(
        { queryKey: categoryKeys.lists() },
        (old) => {
          if (!old) {
            return old;
          }

          if ("pages" in old) {
            if (!old.pages || old.pages.length === 0) {
              return old;
            }
            const [firstPage, ...restPages] = old.pages;
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  data: [optimisticCategory, ...(firstPage.data ?? [])],
                },
                ...restPages,
              ],
            };
          }

          if ("data" in old) {
            return { ...old, data: [optimisticCategory, ...(old.data ?? [])] };
          }

          return old;
        },
      );

      return { previous };
    },
    onError: (_err, _input, context) => {
      // Only reached on a real failure — a pause while offline resolves via
      // resumePausedMutations() later and skips onError entirely.
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      // On success this refetches and the temp row is replaced by the real
      // server row. Harmless while offline — it just marks the queries stale
      // for the next time they're fetched.
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

type CreateTargetContext = {
  previous: Array<[QueryKey, unknown]>;
};

// Registers the mutationFn + optimistic update logic for the "create
// target" mutation, keyed by TARGET_CREATE_MUTATION_KEY. Mirrors the
// expense/category registrations above; called from
// registerMutationDefaults so a single import-time side effect (see
// query-client.ts) registers all of them.
function registerTargetCreateDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults<
    Target,
    Error,
    TargetInput,
    CreateTargetContext
  >(TARGET_CREATE_MUTATION_KEY, {
    mutationFn: (input) => api().target.create(input).then((r) => r.data),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: targetKeys.lists() });

      // Snapshot every matching list query so we can roll back on a real
      // failure (a pause while offline does not trigger onError).
      const previous = queryClient.getQueriesData({
        queryKey: targetKeys.lists(),
      });

      // Negative + timestamp-based so it never collides with a real
      // (positive) server id, and `id < 0` doubles as the "optimistic" check.
      const tempId = -Date.now();
      const now = new Date().toISOString();

      const optimisticTarget: Target & { __optimistic: true } = {
        id: tempId,
        name: input.name,
        // input.targetAmount is the raw form value in PESOS, but
        // Target.targetAmount is stored/displayed in CENTS everywhere (the
        // server multiplies by 100 on create). Mirror that conversion here
        // so the optimistic row shows the same value as the real server row
        // it's replaced by after sync — otherwise it renders 100x too small.
        targetAmount: Math.round(input.targetAmount * 100),
        paidAmount: 0,
        type: input.type,
        direction: input.direction,
        status: "active",
        deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : undefined,
        createdAt: now,
        updatedAt: now,
        __optimistic: true,
      };

      queryClient.setQueriesData<InfiniteData<ListTarget>>(
        { queryKey: targetKeys.lists() },
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) {
            return old;
          }

          const [firstPage, ...restPages] = old.pages;
          return {
            ...old,
            pages: [
              { ...firstPage, data: [optimisticTarget, ...firstPage.data] },
              ...restPages,
            ],
          };
        },
      );

      return { previous };
    },
    onError: (_err, _input, context) => {
      // Only reached on a real failure — a pause while offline resolves via
      // resumePausedMutations() later and skips onError entirely.
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      // On success this refetches and the temp row is replaced by the real
      // server row. Harmless while offline — it just marks the queries stale
      // for the next time they're fetched.
      queryClient.invalidateQueries({ queryKey: targetKeys.lists() });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// CreateTargetLogVariables (targetId + input) is defined in
// services/api-hook/target.ts and imported above as a type-only import —
// this module already has a runtime dependency on that file (targetKeys/
// targetLogKeys), so the type flows the same direction. It carries targetId
// alongside the form input because a mutation paused offline and persisted
// across a cold restart resumes with NO closure — react-query can only
// serialize/restore the variables it was called with, not the component
// scope that called mutate(). mutationFn/onMutate/onSettled below therefore
// read targetId from the variables, not from an outer scope.

type CreateTargetLogContext = {
  previous: Array<[QueryKey, unknown]>;
  targetId: number;
};

// Registers the mutationFn + optimistic update logic for the "create target
// log" mutation, keyed by TARGET_LOG_CREATE_MUTATION_KEY. Mirrors the
// registrations above, except the mutation variables carry targetId (see
// CreateTargetLogVariables) since the logs list is scoped per-target.
function registerTargetLogCreateDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults<
    TargetLog,
    Error,
    CreateTargetLogVariables,
    CreateTargetLogContext
  >(TARGET_LOG_CREATE_MUTATION_KEY, {
    mutationFn: ({ targetId, input }) =>
      api()
        .target.logs.create(String(targetId), input)
        .then((r) => r.data),
    onMutate: async ({ targetId, input }) => {
      const listKey = targetLogKeys.list(String(targetId));
      await queryClient.cancelQueries({ queryKey: listKey });

      // Snapshot every matching list query so we can roll back on a real
      // failure (a pause while offline does not trigger onError).
      const previous = queryClient.getQueriesData({ queryKey: listKey });

      // Negative + timestamp-based so it never collides with a real
      // (positive) server id, and `id < 0` doubles as the "optimistic" check.
      const tempId = -Date.now();
      const now = new Date().toISOString();

      const optimisticLog: TargetLog & { __optimistic: true } = {
        id: tempId,
        targetId,
        // input.amount is the raw form value in PESOS, but TargetLog.amount
        // is stored/displayed in CENTS everywhere (the server multiplies by
        // 100 on create). Mirror that conversion here so the optimistic row
        // shows the same value as the real server row it's replaced by after
        // sync — otherwise it renders 100x too small.
        amount: Math.round(input.amount * 100),
        notes: input.notes,
        entryDate: input.entryDate,
        createdAt: now,
        updatedAt: now,
        __optimistic: true,
      };

      queryClient.setQueriesData<InfiniteData<ListTargetLog>>(
        { queryKey: listKey },
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) {
            return old;
          }

          const [firstPage, ...restPages] = old.pages;
          return {
            ...old,
            pages: [
              { ...firstPage, data: [optimisticLog, ...firstPage.data] },
              ...restPages,
            ],
          };
        },
      );

      return { previous, targetId };
    },
    onError: (_err, _vars, context) => {
      // Only reached on a real failure — a pause while offline resolves via
      // resumePausedMutations() later and skips onError entirely.
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data, _error, vars) => {
      // On success this refetches and the temp row is replaced by the real
      // server row. Harmless while offline — it just marks the queries stale
      // for the next time they're fetched. Also invalidate the target lists
      // since a new log changes the target's paidAmount.
      queryClient.invalidateQueries({
        queryKey: targetLogKeys.list(String(vars.targetId)),
      });
      queryClient.invalidateQueries({ queryKey: targetKeys.lists() });
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
