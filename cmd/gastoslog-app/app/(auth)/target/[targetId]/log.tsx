import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { FormField } from "@/components/FormField";
import { DatePicker } from "@/components/DatePicker";
import { Screen } from "@/components/Screen";
import { useCreateTargetLog } from "@/services/api-hook/target";
import {
  TargetLogInputSchema,
  type TargetLogInput,
} from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";

export function TargetLogForm({
  targetId,
  onSubmit,
}: {
  targetId: string;
  onSubmit: (input: TargetLogInput) => void;
}) {
  const { control, handleSubmit } = useForm({
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
    <Screen scroll keyboardAvoiding>
      <HGroup title="Add Progress" />

      <FormField
        control={control}
        name="amount"
        label="Amount"
        required
        variant="amount"
        placeholder="Amount"
      />

      <FormField
        control={control}
        name="notes"
        label="Notes (Optional)"
        placeholder="e.g., Monthly savings"
        multiline
      />

      <Controller
        name="entryDate"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Entry Date" required />
            <DatePicker
              value={value}
              onChange={(date) => onChange(date)}
              placeholder="Select date"
              maximumDate={new Date()}
            />
          </Fieldset>
        )}
      />

      <Button onPressIn={onFormSubmit}>
        <ButtonText>Add Progress</ButtonText>
      </Button>
    </Screen>
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
