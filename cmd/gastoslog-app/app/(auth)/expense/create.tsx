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
import { fromCentToRegularPrice } from "@/services/string";
import type { Category } from "@/types/category";
import {
  ExpenseInputSchema,
  type Expense,
  type ExpenseInput,
} from "@/types/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";

type ExpenseFormBaseProps = {
  onSubmit: (input: ExpenseInput) => void;
  categories: Array<Category>;
};

type CreateExpenseFormProps = ExpenseFormBaseProps & {
  action: "create";
};

type EditExpenseFormProps = ExpenseFormBaseProps & {
  action: "edit";
  expense: Expense;
};

type ExpenseFormProps = CreateExpenseFormProps | EditExpenseFormProps;

export function ExpenseForm(props: ExpenseFormProps) {
  let title = "New Expense";
  if (props.action === "edit") {
    title = "Edit Expense";
  }
  const { control, formState, handleSubmit } = useForm({
    defaultValues:
      props.action === "edit"
        ? {
            amount: fromCentToRegularPrice(props.expense.amount),
            description: props.expense.description,
            categoryId: props.expense.category.id,
          }
        : {
            amount: undefined,
            description: "",
            categoryId: props.categories
              ? props.categories?.[0]?.id
              : undefined,
          },
    resolver: zodResolver(ExpenseInputSchema),
  });

  const onSubmit = handleSubmit((payload) => {
    props.onSubmit(payload);
  });

  return (
    <Screen scroll keyboardAvoiding>
      <HGroup title={title} />

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
        render={({ field: { onChange, value }, formState }) => (
          <Fieldset>
            <Label name="Category" required />
            <SelectCategory
              value={value ?? null}
              onChange={(item) =>
                onChange((item as SelectItem)?.value ?? null)
              }
              isLoading={formState.isSubmitting}
            />
          </Fieldset>
        )}
      />
      <InputError name="categoryId" errors={formState.errors} />

      <FormField
        control={control}
        name="description"
        label="Description"
        placeholder="Description"
        autoCapitalize="none"
      />

      <Button onPressIn={onSubmit}>
        <ButtonText>
          {props.action === "create" ? "Create" : "Update"} expense
        </ButtonText>
      </Button>
    </Screen>
  );
}

export default function CreateExpenseScreen() {
  const router = useRouter();
  const categories = useCategories();

  const mutation = useCreateExpense({
    onSuccess: () => {
      router.push({
        pathname: "/(auth)/(tabs)/expense",
        params: {
          success: "Expense has been created!",
        },
      });
    },
  });

  const onSubmit = (payload: ExpenseInput) => {
    mutation.mutate(payload);
  };

  if (categories.data) {
    return (
      <ExpenseForm
        action="create"
        categories={categories.data.data}
        onSubmit={onSubmit}
      />
    );
  }

  return <LoadingState />;
}
