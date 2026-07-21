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
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { ExpenseInputSchema, type ExpenseInput } from "@/types/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
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
  const isOnline = useOnlineStatus();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // react-query does not scope a useMutation() hook's onSuccess/onError to
  // the component's lifetime: they're captured on the underlying Mutation
  // instance at the moment mutate() is called and invoked directly from
  // Mutation.execute()/continue(), regardless of whether this screen is
  // still mounted. That matters here specifically because the create
  // mutation can be paused (offline) and resumed much later — by the time
  // it actually resolves, the user may well have navigated away already.
  // Without this guard, that later resolution would fire the router.push
  // below and yank the user back to the expense list from wherever they
  // currently are.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      if (!isMountedRef.current) {
        return;
      }
      router.push({
        pathname: "/(auth)/(tabs)/expense",
        params: {
          success: "Expense has been created!",
        },
      });
    },
    onError: (error) => {
      if (!isMountedRef.current) {
        return;
      }
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to create expense. Please try again."),
      );
    },
  });

  const onSubmit = (payload: ExpenseInput) => {
    setSubmitError(null);
    mutation.mutate(payload);

    if (!isOnline) {
      // Offline: the mutation pauses (networkMode: "online") and only
      // resumes once connectivity returns, so the onSuccess above won't fire
      // now — navigate right away so the user isn't left staring at the form
      // after tapping "Create". The optimistic row already appeared in the
      // list via onMutate.
      router.push({
        pathname: "/(auth)/(tabs)/expense",
        params: {
          // Kept short — the persistent "waiting to sync" pill on the expense
          // list (PendingSyncBadge) already communicates the sync status, so
          // repeating it here would be redundant.
          success: "Expense saved offline",
        },
      });
    }
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
