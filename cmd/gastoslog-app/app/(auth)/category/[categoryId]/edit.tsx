import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

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
import { CategoryInputSchema, type Category, type CategoryInput } from "@/types/category";
import { useLocalSearchParams, useRouter } from "expo-router";

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

  return <LoadingState />;
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

  const { control, handleSubmit } = useForm({
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
    <Screen scroll keyboardAvoiding>
      <HGroup title={title} />

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

      <Button onPressIn={onSubmit}>
        <ButtonText>
          {props.action === "create" ? "Create" : "Update"} category
        </ButtonText>
      </Button>
    </Screen>
  );
}
