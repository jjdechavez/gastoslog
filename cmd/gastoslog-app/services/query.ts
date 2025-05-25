import {
  QueryKey,
  UseQueryOptions,
  QueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";

export type UseQueryOptionsWrapper<
  // Return type of queryFn
  TQueryFn = unknown,
  // Type thrown in case the queryFn rejects
  E = Error,
  // Query key type
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<TQueryFn, E, TQueryFn, TQueryKey>,
  "queryKey" | "queryFn" | "select" | "refetchInterval"
>;

export type TQueryKey<TKey, TListQuery = any, TDetailQuery = string> = {
  all: [TKey];
  lists: () => [...TQueryKey<TKey>["all"], "list"];
  list: (
    query?: TListQuery,
  ) => [
    ...ReturnType<TQueryKey<TKey>["lists"]>,
    { query: TListQuery | undefined },
  ];
  details: () => [...TQueryKey<TKey>["all"], "detail"];
  detail: (
    id: TDetailQuery,
  ) => [...ReturnType<TQueryKey<TKey>["details"]>, TDetailQuery];
};

export const queryKeysFactory = <
  T,
  TListQueryType = any,
  TDetailQueryType = string,
>(
  globalKey: T,
) => {
  const queryKeyFactory: TQueryKey<T, TListQueryType, TDetailQueryType> = {
    all: [globalKey],
    lists: () => [...queryKeyFactory.all, "list"],
    list: (query?: TListQueryType) => [...queryKeyFactory.lists(), { query }],
    details: () => [...queryKeyFactory.all, "detail"],
    detail: (id: TDetailQueryType) => [...queryKeyFactory.details(), id],
  };
  return queryKeyFactory;
};

export const buildOptions = <
  TData,
  TError,
  TVariables,
  TContext,
  TKey extends QueryKey,
>(
  queryClient: QueryClient,
  queryKey?: TKey,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationOptions<TData, TError, TVariables, TContext> => {
  return {
    ...options,
    onSuccess: (...args) => {
      if (options?.onSuccess) {
        return options.onSuccess(...args);
      }

      if (queryKey !== undefined) {
        queryKey.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as QueryKey });
        });
      }
    },
  };
};
