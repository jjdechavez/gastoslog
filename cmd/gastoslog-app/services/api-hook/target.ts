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
  options?: UseMutationOptions<{ data: Target }, Error, TargetInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TargetInput) => api().target.create(input),
    ...buildOptions(queryClient, [targetKeys.lists()], options),
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

export const useCreateTargetLog = (
  targetId: string,
  options?: UseMutationOptions<{ data: TargetLog }, Error, TargetLogInput>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TargetLogInput) =>
      api().target.logs.create(targetId, input),
    ...buildOptions(
      queryClient,
      [targetLogKeys.list(targetId), targetLogKeys.lists()],
      options,
    ),
  });
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
