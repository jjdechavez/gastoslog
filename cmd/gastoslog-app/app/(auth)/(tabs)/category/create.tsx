import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button, ButtonText } from "@/components/Button";
import { HGroup } from "@/components/HGroup";
import { Input, InputError } from "@/components/Input";
import { ThemedView } from "@/components/ThemedView";
import { PicoLimeStyles } from "@/styles/pico-lime";
import { NewCategorySchema } from "@/services/api";
import { useCreateCategory } from "@/services/api-hook/category";
import { useRouter } from "expo-router";

export default function CreateCategoryScreen() {
  const router = useRouter();
  const { control, formState, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    resolver: zodResolver(NewCategorySchema),
  });

  const mutation = useCreateCategory({
    onSuccess: () => {
      router.push("/(auth)/(tabs)/category");
    },
  });

  const onSubmit = handleSubmit((payload) => {
    mutation.mutate(payload);
  });

  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="New Category" />

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
        <ButtonText>Create category</ButtonText>
      </Button>
    </ThemedView>
  );
}
