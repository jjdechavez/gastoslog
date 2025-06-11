import { CategoryInput } from "@/services/api";
import { useCreateCategory } from "@/services/api-hook/category";
import { useRouter } from "expo-router";
import { CategoryForm } from "./[categoryId]/edit";

export default function CreateCategoryScreen() {
  const router = useRouter();
  const mutation = useCreateCategory({
    onSuccess: () => {
      router.push("/(auth)/(tabs)/category");
    },
  });

  const onSubmit = (payload: CategoryInput) => {
    mutation.mutate(payload);
  };

  return <CategoryForm action="create" onSubmit={onSubmit} />;
}
