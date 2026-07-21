import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { CategoryInputSchema, type CategoryInput } from "@/types/category";
import { useCreateCategory } from "@/services/api-hook/category";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { useRouter } from "expo-router";
import { CategoryForm, type CategoryFormValues } from "./[categoryId]/edit";

export default function CreateCategoryScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues, any, CategoryInput>({
    defaultValues: { name: "", description: "" },
    resolver: zodResolver(CategoryInputSchema),
  });

  const mutation = useCreateCategory({
    onSuccess: () => {
      router.push({
        pathname: "/(auth)/category",
        params: {
          success: "Category has been created!",
        },
      });
    },
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to create category. Please try again."),
      );
    },
  });

  const onSubmit = (payload: CategoryInput) => {
    setSubmitError(null);
    mutation.mutate(payload);
  };

  return (
    <CategoryForm
      action="create"
      form={form}
      onSubmit={onSubmit}
      submitError={submitError}
      isSubmitting={mutation.isPending}
    />
  );
}
