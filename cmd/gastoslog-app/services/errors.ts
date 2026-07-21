import type { FieldValues, UseFormReturn } from "react-hook-form";

export type ApiErrorDetail = {
  message?: string;
  location?: string;
  value?: unknown;
};

export type ApiErrorBody = {
  status?: number;
  title?: string;
  detail?: string;
  errors?: ApiErrorDetail[];
};

export function getErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: ApiErrorBody } | undefined)?.data;
  return data?.detail || fallback;
}

export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  form: Pick<UseFormReturn<T>, "setError">,
) {
  const data = (error as { data?: ApiErrorBody } | undefined)?.data;
  data?.errors?.forEach((detail) => {
    if (!detail.location) return;
    const field = detail.location.replace(/^(body|query|path)\./, "");
    form.setError(field as any, {
      type: "server",
      message: detail.message ?? "Invalid value",
    });
  });
}
