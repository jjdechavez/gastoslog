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

export type TQueryKey<
  TKey,
  TListQuery = any,
  TDetailQuery = string,
  TSummaryQuery = any,
> = {
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
  // Aggregates that are derived from a filter rather than a page of rows. Kept
  // in their own namespace ("summary") and built from the filter alone, so
  // paginating or scrolling never invalidates them and a stale total can't be
  // mistaken for a fresh one.
  summaries: () => [...TQueryKey<TKey>["all"], "summary"];
  summary: (
    query?: TSummaryQuery,
  ) => [
    ...ReturnType<TQueryKey<TKey>["summaries"]>,
    { query: TSummaryQuery | undefined },
  ];
};

export const queryKeysFactory = <
  T,
  TListQueryType = any,
  TDetailQueryType = string,
  TSummaryQueryType = any,
>(
  globalKey: T,
) => {
  const queryKeyFactory: TQueryKey<
    T,
    TListQueryType,
    TDetailQueryType,
    TSummaryQueryType
  > = {
    all: [globalKey],
    lists: () => [...queryKeyFactory.all, "list"],
    list: (query?: TListQueryType) => [...queryKeyFactory.lists(), { query }],
    details: () => [...queryKeyFactory.all, "detail"],
    detail: (id: TDetailQueryType) => [...queryKeyFactory.details(), id],
    summaries: () => [...queryKeyFactory.all, "summary"],
    summary: (query?: TSummaryQueryType) => [
      ...queryKeyFactory.summaries(),
      { query },
    ],
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
