import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { Input, InputError } from "@/components/Input";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DatePicker } from "@/components/DatePicker";
import { useCreateTargetLog } from "@/services/api-hook/target";
import {
  TargetLogInputSchema,
  type TargetLogInput,
} from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { PicoLimeStyles } from "@/styles/pico-lime";

export function TargetLogForm({
  targetId,
  onSubmit,
}: {
  targetId: string;
  onSubmit: (input: TargetLogInput) => void;
}) {
  const { control, formState, handleSubmit } = useForm({
    defaultValues: {
      amount: undefined as number | undefined,
      notes: "",
      entryDate: new Date(),
    },
    resolver: zodResolver(TargetLogInputSchema),
  });

  const onFormSubmit = handleSubmit((payload) => {
    const input: TargetLogInput = {
      amount: payload.amount!,
      notes: payload.notes,
      entryDate: payload.entryDate.toISOString(),
    };
    onSubmit(input);
  });

  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="Add Progress" />

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
        name="notes"
        control={control}
        render={({ field: { onChange, onBlur, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Notes (Optional)" />
              <Input
                placeholder="e.g., Monthly savings"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                isLoading={formState.isSubmitting}
                multiline
              />
            </Fieldset>
          );
        }}
      />

      <Controller
        name="entryDate"
        control={control}
        render={({ field: { onChange, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Entry Date" required />
              <DatePicker
                value={value}
                onChange={(date) => onChange(date)}
                placeholder="Select date"
                maximumDate={new Date()}
              />
            </Fieldset>
          );
        }}
      />

      <Button onPressIn={onFormSubmit}>
        <ButtonText>Add Progress</ButtonText>
      </Button>
    </ThemedView>
  );
}

export default function CreateTargetLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetId = params.targetId as string;

  const mutation = useCreateTargetLog(targetId, {
    onSuccess: () => {
      router.push({
        pathname: "/(auth)/target/[targetId]",
        params: {
          targetId,
          success: "Progress has been added!",
        },
      });
    },
  });

  const onSubmit = (payload: TargetLogInput) => {
    mutation.mutate(payload);
  };

  return <TargetLogForm targetId={targetId} onSubmit={onSubmit} />;
}
