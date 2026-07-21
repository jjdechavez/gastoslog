import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { DatePicker } from "@/components/DatePicker";
import { FormField } from "@/components/FormField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Screen } from "@/components/Screen";
import { useCreateTarget } from "@/services/api-hook/target";
import {
  TargetInputSchema,
  type TargetInput,
} from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";

const TARGET_TYPES = [
  { label: "Savings", value: "savings" },
  { label: "Debt", value: "debt" },
  { label: "Loan", value: "loan" },
] as const;

const TARGET_DIRECTIONS = [
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
] as const;

export function TargetForm({
  onSubmit,
}: {
  onSubmit: (input: TargetInput) => void;
}) {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      name: "",
      targetAmount: undefined as number | undefined,
      type: "savings" as const,
      direction: "inbound" as const,
      deadlineAt: undefined as Date | undefined,
    },
    resolver: zodResolver(TargetInputSchema),
  });

  const onFormSubmit = handleSubmit((payload) => {
    const input: TargetInput = {
      name: payload.name,
      targetAmount: payload.targetAmount!,
      type: payload.type,
      direction: payload.direction,
      deadlineAt: payload.deadlineAt?.toISOString(),
    };
    onSubmit(input);
  });

  return (
    <Screen scroll keyboardAvoiding>
      <HGroup title="New Target" />

      <FormField
        control={control}
        name="name"
        label="Name"
        required
        placeholder="e.g., Emergency Fund"
      />

      <FormField
        control={control}
        name="targetAmount"
        label="Target Amount"
        required
        variant="amount"
        placeholder="Amount"
      />

      <Controller
        name="type"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Type" required />
            <SegmentedControl
              options={TARGET_TYPES}
              value={value}
              onChange={onChange}
            />
          </Fieldset>
        )}
      />

      <Controller
        name="direction"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Direction" required />
            <SegmentedControl
              options={TARGET_DIRECTIONS}
              value={value}
              onChange={onChange}
            />
          </Fieldset>
        )}
      />

      <Controller
        name="deadlineAt"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Deadline (Optional)" />
            <DatePicker
              value={value || new Date()}
              onChange={(date) => onChange(date)}
              placeholder="Select deadline"
              minimumDate={new Date()}
            />
          </Fieldset>
        )}
      />

      <Button onPressIn={onFormSubmit}>
        <ButtonText>Create Target</ButtonText>
      </Button>
    </Screen>
  );
}

export default function CreateTargetScreen() {
  const router = useRouter();

  const mutation = useCreateTarget({
    onSuccess: () => {
      router.push({
        pathname: "/(auth)/(tabs)/target",
        params: {
          success: "Target has been created!",
        },
      });
    },
  });

  const onSubmit = (payload: TargetInput) => {
    mutation.mutate(payload);
  };

  return <TargetForm onSubmit={onSubmit} />;
}
