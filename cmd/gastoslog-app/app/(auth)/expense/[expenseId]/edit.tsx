import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/ScreenState";
import { useCategories } from "@/services/api-hook/category";
import {
  expenseKeys,
  useExpense,
  useUpdateExpense,
} from "@/services/api-hook/expense";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { fromCentToRegularPrice } from "@/services/string";
import { ExpenseInputSchema, type ExpenseInput } from "@/types/expense";
import { ExpenseForm, type ExpenseFormValues } from "../create";

export default function EditExpenseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { expenseId } = useLocalSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, status } = useExpense(expenseId as string);
  const categories = useCategories();

  const form = useForm<ExpenseFormValues, any, ExpenseInput>({
    defaultValues: {
      amount: undefined,
      description: "",
      categoryId: undefined,
    },
    resolver: zodResolver(ExpenseInputSchema),
  });

  useEffect(() => {
    if (data?.data) {
      form.reset({
        amount: fromCentToRegularPrice(data.data.amount),
        description: data.data.description,
        categoryId: data.data.category.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data]);

  const mutation = useUpdateExpense(expenseId as string, {
    onSuccess: (updatedExpense) => {
      queryClient.setQueryData(
        expenseKeys.detail(expenseId as string),
        updatedExpense,
      );
      router.push({
        pathname: "/(auth)/(tabs)/expense",
        params: {
          success: "Expense has been updated!",
        },
      });
    },
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to update expense. Please try again."),
      );
    },
  });

  const onSubmit = (payload: ExpenseInput) => {
    setSubmitError(null);
    mutation.mutate(payload);
  };

  if (categories.data && status === "success") {
    return (
      <ExpenseForm
        action="edit"
        form={form}
        onSubmit={onSubmit}
        submitError={submitError}
        isSubmitting={mutation.isPending}
      />
    );
  }

  return <LoadingState />;
}
