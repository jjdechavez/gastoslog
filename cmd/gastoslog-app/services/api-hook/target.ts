import {
  useInfiniteQuery,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/services/api";
import {
  buildOptions,
  queryKeysFactory,
  UseQueryOptionsWrapper,
} from "@/services/query";
import {
  TARGET_CREATE_MUTATION_KEY,
  TARGET_LOG_CREATE_MUTATION_KEY,
} from "@/services/offline/mutation-keys";
import type {
  Target,
  TargetInput,
  TargetLog,
  TargetLogInput,
} from "@/types/target";

const TARGET_QUERY_KEY = `targets` as const;

export const targetKeys = queryKeysFactory(TARGET_QUERY_KEY);

type TargetsQueryKey = typeof targetKeys;

export const useTargets = (
  query?: { status?: string; direction?: string },
  options?: UseQueryOptionsWrapper<
    { data: Target[]; meta: { page: number; limit: number } },
    Error,
    ReturnType<TargetsQueryKey["list"]>
  >,
) => {
  return useInfiniteQuery({
    queryKey: targetKeys.list(query),
    queryFn: ({ pageParam = 1 }) =>
      api().target.list({ ...query, page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
    ...options,
  });
};

export const useCreateTarget = (
  options?: UseMutationOptions<Target, Error, TargetInput>,
) => {
  // mutationFn + the optimistic onMutate/onSettled pair come from the
  // mutationDefaults registered in services/offline/mutation-defaults.ts
  // (keyed by TARGET_CREATE_MUTATION_KEY) — this is what lets a mutation
  // paused offline resume correctly after a cold restart, mirroring
  // useCreateExpense/useCreateCategory. Note the mutationFn there already
  // unwraps `{ data: Target }` down to `Target`, so this hook (unlike the
  // untouched useUpdateTarget/useDeleteTarget below, which still call the
  // API directly) resolves to a bare Target.
  return useMutation({
    mutationKey: TARGET_CREATE_MUTATION_KEY,
    ...options,
  });
};

export const useTarget = (
  targetId: string,
  options?: UseQueryOptionsWrapper<
    { data: Target },
    Error,
    ReturnType<TargetsQueryKey["detail"]>
  >,
) => {
  return useQuery({
    queryKey: targetKeys.detail(targetId),
    queryFn: () => api().target.detail(targetId),
    ...options,
  });
};

export const useUpdateTarget = (
  targetId: string,
  options?: UseMutationOptions<{ data: Target }, Error, TargetInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TargetInput) => api().target.update(targetId, input),
    ...buildOptions(
      queryClient,
      [targetKeys.lists(), targetKeys.detail(targetId)],
      options,
    ),
  });
};

export const useDeleteTarget = (
  targetId: string,
  options?: UseMutationOptions<void, Error>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api().target.delete(targetId),
    ...buildOptions(
      queryClient,
      [targetKeys.lists(), targetKeys.detail(targetId)],
      options,
    ),
  });
};

const TARGET_LOG_QUERY_KEY = `targetLogs` as const;

export const targetLogKeys = {
  all: [TARGET_LOG_QUERY_KEY] as const,
  lists: () => [...targetLogKeys.all, "list"] as const,
  list: (targetId: string) =>
    [...targetLogKeys.lists(), { targetId }] as const,
  details: () => [...targetLogKeys.all, "detail"] as const,
  detail: (targetId: string, logId: string) =>
    [...targetLogKeys.details(), { targetId, logId }] as const,
};

export const useTargetLogs = (
  targetId: string,
  options?: UseQueryOptionsWrapper<
    { data: TargetLog[]; meta: { page: number; limit: number } },
    Error,
    ReturnType<typeof targetLogKeys.list>
  >,
) => {
  return useInfiniteQuery({
    queryKey: targetLogKeys.list(targetId),
    queryFn: ({ pageParam = 1 }) =>
      api().target.logs.list(targetId, { page: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.meta.page + 1;
    },
    getPreviousPageParam: (firstPage) => firstPage.meta.page - 1,
    initialPageParam: 1,
    ...options,
  });
};

// Variables for the "create target log" mutation. Exported so
// services/offline/mutation-defaults.ts can type its setMutationDefaults
// call against the exact same shape without a require cycle (that module
// already imports targetKeys/targetLogKeys from this one, so the type flows
// the same direction as the existing runtime dependency).
//
// A paused offline mutation resumes after a cold restart with NO closure —
// react-query persists only the mutationKey + variables, not the component
// scope that called mutate() — so the mutationFn registered in
// mutation-defaults.ts cannot rely on a `targetId` captured from this hook's
// argument. It must come from the variables on every call, hence the
// wrapper below: useCreateTargetLog(targetId) keeps the ergonomic call site
// (screens still call `mutation.mutate(input)`), but internally packs
// targetId into the actual mutation variables.
export type CreateTargetLogVariables = {
  targetId: number;
  input: TargetLogInput;
};

export const useCreateTargetLog = (
  targetId: string,
  options?: UseMutationOptions<TargetLog, Error, TargetLogInput>,
) => {
  const mutation = useMutation<TargetLog, Error, CreateTargetLogVariables>({
    mutationKey: TARGET_LOG_CREATE_MUTATION_KEY,
    // `options` is typed against the public TargetLogInput variable shape
    // (so call sites like the log-create screen don't need to know about
    // the internal { targetId, input } wrapping), but the underlying
    // useMutation is keyed on CreateTargetLogVariables. Only
    // onSuccess/onError/onSettled are ever passed in by callers, and none of
    // them rely on the `variables` callback argument, so this cast is safe
    // in practice even though the shapes don't structurally overlap.
    ...(options as unknown as UseMutationOptions<
      TargetLog,
      Error,
      CreateTargetLogVariables
    >),
  });

  return {
    ...mutation,
    mutate: (input: TargetLogInput) =>
      mutation.mutate({ targetId: Number(targetId), input }),
    mutateAsync: (input: TargetLogInput) =>
      mutation.mutateAsync({ targetId: Number(targetId), input }),
  };
};

export const useTargetLog = (
  targetId: string,
  logId: string,
  options?: UseQueryOptionsWrapper<
    { data: TargetLog },
    Error,
    ReturnType<typeof targetLogKeys.detail>
  >,
) => {
  return useQuery({
    queryKey: targetLogKeys.detail(targetId, logId),
    queryFn: () => api().target.logs.detail(targetId, logId),
    ...options,
  });
};

export const useUpdateTargetLog = (
  targetId: string,
  logId: string,
  options?: UseMutationOptions<{ data: TargetLog }, Error, TargetLogInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TargetLogInput) =>
      api().target.logs.update(targetId, logId, input),
    ...buildOptions(
      queryClient,
      [targetLogKeys.list(targetId), targetLogKeys.detail(targetId, logId)],
      options,
    ),
  });
};

export const useDeleteTargetLog = (
  targetId: string,
  logId: string,
  options?: UseMutationOptions<void, Error>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api().target.logs.delete(targetId, logId),
    ...buildOptions(
      queryClient,
      [targetLogKeys.list(targetId), targetLogKeys.detail(targetId, logId)],
      options,
    ),
  });
};
