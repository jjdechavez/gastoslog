import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import type { z } from "zod/v4";

import { Alert } from "@/components/Alert";
import { Button, ButtonText } from "@/components/Button";
import { HGroup } from "@/components/HGroup";
import { FormField } from "@/components/FormField";
import { LoadingState } from "@/components/ScreenState";
import { Screen } from "@/components/Screen";
import {
  categoryKeys,
  useCategory,
  useUpdateCategory,
} from "@/services/api-hook/category";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { CategoryInputSchema, type CategoryInput } from "@/types/category";
import { useLocalSearchParams, useRouter } from "expo-router";

export type CategoryFormValues = z.input<typeof CategoryInputSchema>;

export default function EditCategoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { categoryId } = useLocalSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, status } = useCategory(categoryId as string);

  const form = useForm<CategoryFormValues, any, CategoryInput>({
    defaultValues: { name: "", description: "" },
    resolver: zodResolver(CategoryInputSchema),
  });

  useEffect(() => {
    if (data?.data) {
      form.reset({ name: data.data.name, description: data.data.description });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data]);

  const mutation = useUpdateCategory(categoryId as string, {
    onSuccess: (updatedCategory) => {
      queryClient.setQueryData(
        categoryKeys.detail(categoryId as string),
        updatedCategory,
      );
      router.push({
        pathname: "/(auth)/category",
        params: {
          success: "Changes were successfully saved!",
        },
      });
    },
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to update category. Please try again."),
      );
    },
  });

  const onSubmit = (input: CategoryInput) => {
    setSubmitError(null);
    mutation.mutate(input);
  };

  if (status === "success") {
    return (
      <CategoryForm
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

type CategoryFormBaseProps = {
  form: UseFormReturn<CategoryFormValues, any, CategoryInput>;
  onSubmit: (input: CategoryInput) => void;
  submitError?: string | null;
  isSubmitting?: boolean;
};

type CreateCategoryFormProps = CategoryFormBaseProps & {
  action: "create";
};

type EditCategoryFormProps = CategoryFormBaseProps & {
  action: "edit";
};

type CategoryFormProps = CreateCategoryFormProps | EditCategoryFormProps;

export function CategoryForm(props: CategoryFormProps) {
  const title = props.action === "edit" ? "Edit Category" : "New Category";

  const { control, handleSubmit } = props.form;

  const onSubmit = handleSubmit((payload) => {
    props.onSubmit(payload);
  });

  return (
    <Screen scroll keyboardAvoiding>
      <HGroup title={title} />

      {props.submitError ? (
        <Alert type="error" message={props.submitError} />
      ) : null}

      <FormField
        control={control}
        name="name"
        label="Name"
        required
        placeholder="Name"
        autoCapitalize="none"
      />

      <FormField
        control={control}
        name="description"
        label="Description"
        placeholder="Description"
        autoCapitalize="none"
      />

      <Button onPressIn={onSubmit} disabled={props.isSubmitting}>
        <ButtonText>
          {props.isSubmitting
            ? "Saving..."
            : `${props.action === "create" ? "Create" : "Update"} category`}
        </ButtonText>
      </Button>
    </Screen>
  );
}
