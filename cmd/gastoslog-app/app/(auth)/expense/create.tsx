import { Alert } from "@/components/Alert";
import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { FormField } from "@/components/FormField";
import { InputError } from "@/components/Input";
import { SelectItem } from "@/components/Select";
import { SelectCategory } from "@/components/SelectCategory";
import { LoadingState } from "@/components/ScreenState";
import { Screen } from "@/components/Screen";
import { useCategories } from "@/services/api-hook/category";
import { useCreateExpense } from "@/services/api-hook/expense";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { ExpenseInputSchema, type ExpenseInput } from "@/types/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import type { z } from "zod/v4";

export type ExpenseFormValues = z.input<typeof ExpenseInputSchema>;

type ExpenseFormBaseProps = {
  form: UseFormReturn<ExpenseFormValues, any, ExpenseInput>;
  onSubmit: (input: ExpenseInput) => void;
  submitError?: string | null;
  isSubmitting?: boolean;
};

type CreateExpenseFormProps = ExpenseFormBaseProps & {
  action: "create";
};

type EditExpenseFormProps = ExpenseFormBaseProps & {
  action: "edit";
};

type ExpenseFormProps = CreateExpenseFormProps | EditExpenseFormProps;

export function ExpenseForm(props: ExpenseFormProps) {
  const title = props.action === "edit" ? "Edit Expense" : "New Expense";
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
  } = props.form;

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
        name="amount"
        label="Amount"
        required
        variant="amount"
        placeholder="Amount"
      />

      <Controller
        name="categoryId"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Category" required />
            <SelectCategory
              value={value ?? null}
              onChange={(item) =>
                onChange((item as SelectItem)?.value ?? null)
              }
              isLoading={formIsSubmitting}
            />
          </Fieldset>
        )}
      />
      <InputError name="categoryId" errors={errors as Record<string, unknown>} />

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
            : `${props.action === "create" ? "Create" : "Update"} expense`}
        </ButtonText>
      </Button>
    </Screen>
  );
}

export default function CreateExpenseScreen() {
  const router = useRouter();
  const categories = useCategories();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues, any, ExpenseInput>({
    defaultValues: {
      amount: undefined,
      description: "",
      categoryId: undefined,
    },
    resolver: zodResolver(ExpenseInputSchema),
  });

  useEffect(() => {
    const firstCategoryId = categories.data?.data?.[0]?.id;
    if (firstCategoryId !== undefined) {
      form.setValue("categoryId", firstCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.data]);

  const mutation = useCreateExpense({
    onSuccess: () => {
      router.push({
        pathname: "/(auth)/(tabs)/expense",
        params: {
          success: "Expense has been created!",
        },
      });
    },
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to create expense. Please try again."),
      );
    },
  });

  const onSubmit = (payload: ExpenseInput) => {
    setSubmitError(null);
    mutation.mutate(payload);
  };

  if (categories.data) {
    return (
      <ExpenseForm
        action="create"
        form={form}
        onSubmit={onSubmit}
        submitError={submitError}
        isSubmitting={mutation.isPending}
      />
    );
  }

  return <LoadingState />;
}
