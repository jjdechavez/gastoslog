export type ListMeta = {
  page: number;
  limit: number;
  s?: string;
};

export type ListResponse<T> = {
  data: Array<T>;
  meta: ListMeta;
};
