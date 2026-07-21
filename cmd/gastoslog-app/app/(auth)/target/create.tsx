import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { Input, InputError } from "@/components/Input";
import { SelectItem } from "@/components/Select";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DatePicker } from "@/components/DatePicker";
import { useCreateTarget } from "@/services/api-hook/target";
import {
  TargetInputSchema,
  type TargetInput,
} from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { PicoLimeStyles } from "@/styles/pico-lime";

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
  const { control, formState, handleSubmit } = useForm({
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
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="New Target" />

      <Controller
        name="name"
        control={control}
        render={({ field: { onChange, onBlur, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Name" required />
              <Input
                placeholder="e.g., Emergency Fund"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                hasError={!!formState.errors.name}
                isLoading={formState.isSubmitting}
              />
            </Fieldset>
          );
        }}
      />
      <InputError name="name" errors={formState.errors} />

      <Controller
        name="targetAmount"
        control={control}
        render={({ field: { onChange, onBlur, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Target Amount" required />
              <Input
                placeholder="Amount"
                inputMode="decimal"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value ? value.toString() : ""}
                hasError={!!formState.errors.targetAmount}
                isLoading={formState.isSubmitting}
              />
            </Fieldset>
          );
        }}
      />
      <InputError name="targetAmount" errors={formState.errors} />

      <Controller
        name="type"
        control={control}
        render={({ field: { onChange, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Type" required />
              <ThemedView style={PicoLimeStyles.row}>
                {TARGET_TYPES.map((type) => (
                  <ThemedView
                    key={type.value}
                    style={[
                      PicoLimeStyles.button,
                      value === type.value && PicoLimeStyles.buttonPrimary,
                      { flex: 1, marginRight: 8 },
                    ]}
                  >
                    <Button
                      onPressIn={() => onChange(type.value)}
                      style={{
                        backgroundColor:
                          value === type.value
                            ? PicoThemeVariables.primaryBackground
                            : "transparent",
                        borderColor: PicoThemeVariables.formElementBorder,
                      }}
                    >
                      <ButtonText
                        style={{
                          color:
                            value === type.value
                              ? PicoThemeVariables.primaryInverse
                              : PicoThemeVariables.textColor,
                        }}
                      >
                        {type.label}
                      </ButtonText>
                    </Button>
                  </ThemedView>
                ))}
              </ThemedView>
            </Fieldset>
          );
        }}
      />

      <Controller
        name="direction"
        control={control}
        render={({ field: { onChange, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Direction" required />
              <ThemedView style={PicoLimeStyles.row}>
                {TARGET_DIRECTIONS.map((dir) => (
                  <ThemedView
                    key={dir.value}
                    style={[{ flex: 1, marginRight: 8 }]}
                  >
                    <Button
                      onPressIn={() => onChange(dir.value)}
                      style={{
                        backgroundColor:
                          value === dir.value
                            ? PicoThemeVariables.primaryBackground
                            : "transparent",
                        borderColor: PicoThemeVariables.formElementBorder,
                      }}
                    >
                      <ButtonText
                        style={{
                          color:
                            value === dir.value
                              ? PicoThemeVariables.primaryInverse
                              : PicoThemeVariables.textColor,
                        }}
                      >
                        {dir.label}
                      </ButtonText>
                    </Button>
                  </ThemedView>
                ))}
              </ThemedView>
            </Fieldset>
          );
        }}
      />

      <Controller
        name="deadlineAt"
        control={control}
        render={({ field: { onChange, value }, formState }) => {
          return (
            <Fieldset>
              <Label name="Deadline (Optional)" />
              <DatePicker
                value={value || new Date()}
                onChange={(date) => onChange(date)}
                placeholder="Select deadline"
                minimumDate={new Date()}
              />
            </Fieldset>
          );
        }}
      />

      <Button onPressIn={onFormSubmit}>
        <ButtonText>Create Target</ButtonText>
      </Button>
    </ThemedView>
  );
}

import { PicoThemeVariables } from "@/styles/pico-lime";

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
