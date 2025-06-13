import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import { Button, ButtonText } from "@/components/Button";
import { HGroup } from "@/components/HGroup";
import { Input, InputError } from "@/components/Input";
import { ThemedView } from "@/components/ThemedView";
import { PicoLimeStyles } from "@/styles/pico-lime";
import { Category, CategoryInput, CategoryInputSchema } from "@/services/api";
import { useCategory, useUpdateCategory } from "@/services/api-hook/category";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { categoryKeys } from "@/hooks/categories/query";

export default function EditCategoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { categoryId } = useLocalSearchParams();

  const { data, status } = useCategory(categoryId as string);

  const mutation = useUpdateCategory(categoryId as string, {
    onSuccess: (updatedCategory) => {
      queryClient.setQueryData(
        categoryKeys.detail(categoryId as string),
        updatedCategory,
      );
      router.push({
        pathname: "/(auth)/(tabs)/category",
        params: {
          success: "Changes were successfully saved!",
        },
      });
    },
  });

  const onSubmit = (input: CategoryInput) => {
    mutation.mutate(input);
  };

  if (status === "success") {
    return (
      <CategoryForm action="edit" category={data.data} onSubmit={onSubmit} />
    );
  }

  return <ThemedText>Loading</ThemedText>;
}

type CategoryFormBaseProps = {
  onSubmit: (input: CategoryInput) => void;
};

type CreateCategoryFormProps = CategoryFormBaseProps & {
  action: "create";
};

type EditCategoryFormProps = CategoryFormBaseProps & {
  action: "edit";
  category: Category;
};

type CategoryFormProps = CreateCategoryFormProps | EditCategoryFormProps;

export function CategoryForm(props: CategoryFormProps) {
  let title = "New Category";
  if (props.action === "edit") {
    title = "Edit Category";
  }

  const { control, formState, handleSubmit } = useForm({
    defaultValues:
      props.action === "edit"
        ? { name: props.category.name, description: props.category.description }
        : {
            name: "",
            description: "",
          },
    resolver: zodResolver(CategoryInputSchema),
  });

  const onSubmit = handleSubmit((payload) => {
    props.onSubmit(payload);
  });

  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title={title} />

      <Controller
        name="name"
        control={control}
        render={({ field: { onChange, onBlur, value }, formState }) => {
          return (
            <Input
              label="Name"
              placeholder="Name"
              autoCapitalize="none"
              required
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              hasError={!!formState.errors.name}
              isLoading={formState.isSubmitting}
            />
          );
        }}
      />
      <InputError name="name" errors={formState.errors} />

      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => {
          return (
            <Input
              label="Description"
              placeholder="Description"
              autoCapitalize="none"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value ?? ""}
              isLoading={formState.isSubmitting}
            />
          );
        }}
      />
      <InputError name="description" errors={formState.errors} />

      <Button onPress={onSubmit}>
        <ButtonText>
          {props.action === "create" ? "Create" : "Update"} category
        </ButtonText>
      </Button>
    </ThemedView>
  );
}
