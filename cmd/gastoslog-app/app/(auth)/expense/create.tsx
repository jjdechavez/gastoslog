import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { Input, InputError } from "@/components/Input";
import { Select } from "@/components/Select";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  Category,
  Expense,
  ExpenseInput,
  ExpenseInputSchema,
} from "@/services/api";
import { useCategories } from "@/services/api-hook/category";
import { useCreateExpense } from "@/services/api-hook/expense";
import { fromCentToRegularPrice } from "@/services/string";
import { PicoLimeStyles } from "@/styles/pico-lime";
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
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title={title} />

      <Controller
        name="amount"
        control={control}
        render={({ field: { onChange, onBlur, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Amount" required />
              <Input
                placeholder="Amount"
                inputMode="decimal"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ? value.toString() : ""}
                hasError={!!formState.errors.amount}
                isLoading={formState.isSubmitting}
              />
            </Fieldset>
          );
        }}
      />
      <InputError name="amount" errors={formState.errors} />

      <Controller
        name="categoryId"
        control={control}
        render={({ field: { onChange, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Category" required />
              <Select
                selectedValue={value ?? ""}
                onValueChange={(itemValue) => onChange(itemValue)}
                enabled={!formState.isSubmitting}
                options={props.categories.map((category) => ({
                  label: category.name,
                  value: category.id,
                }))}
              />
            </Fieldset>
          );
        }}
      />
      <InputError name="categoryId" errors={formState.errors} />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => {
          return (
            <Fieldset>
              <Label name="Description" />
              <Input
                placeholder="Description"
                autoCapitalize="none"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ?? ""}
                isLoading={formState.isSubmitting}
              />
            </Fieldset>
          );
        }}
      />
      <InputError name="description" errors={formState.errors} />

      <Button onPressIn={onSubmit}>
        <ButtonText>
          {props.action === "create" ? "Create" : "Update"} expense
        </ButtonText>
      </Button>
    </ThemedView>
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

  return <ThemedText>Loading</ThemedText>;
}
