import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { useCategories } from "@/services/api-hook/category";
import {
  expenseKeys,
  useExpense,
  useUpdateExpense,
} from "@/services/api-hook/expense";
import { ExpenseInput } from "@/types/expense";
import { ExpenseForm } from "../create";

export default function EditExpenseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { expenseId } = useLocalSearchParams();

  const { data, status } = useExpense(expenseId as string);

  const categories = useCategories();
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
  });

  const onSubmit = (payload: ExpenseInput) => {
    mutation.mutate(payload);
  };

  if (categories.data && status === "success") {
    return (
      <ExpenseForm
        action="edit"
        expense={data.data}
        categories={categories.data.data}
        onSubmit={onSubmit}
      />
    );
  }

  return <ThemedText>Loading</ThemedText>;
}
