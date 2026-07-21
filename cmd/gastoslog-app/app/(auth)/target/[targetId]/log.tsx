import { Alert } from "@/components/Alert";
import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { FormField } from "@/components/FormField";
import { InputError } from "@/components/Input";
import { DatePicker } from "@/components/DatePicker";
import { Screen } from "@/components/Screen";
import { useCreateTargetLog } from "@/services/api-hook/target";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { TargetLogInputSchema, type TargetLogInput } from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { useState } from "react";
import type { z } from "zod/v4";

export type TargetLogFormValues = z.input<typeof TargetLogInputSchema>;

export function TargetLogForm({
  form,
  onSubmit,
  submitError,
  isSubmitting,
}: {
  form: UseFormReturn<TargetLogFormValues, any, TargetLogInput>;
  onSubmit: (input: TargetLogInput) => void;
  submitError?: string | null;
  isSubmitting?: boolean;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onFormSubmit = handleSubmit((payload) => {
    onSubmit(payload);
  });

  return (
    <Screen scroll keyboardAvoiding>
      {submitError ? <Alert type="error" message={submitError} /> : null}

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
              onChange={(date) => onChange(date.toISOString())}
              placeholder="Select date"
              maximumDate={new Date()}
            />
          </Fieldset>
        )}
      />
      <InputError name="entryDate" errors={errors as Record<string, unknown>} />

      <Button onPressIn={onFormSubmit} disabled={isSubmitting}>
        <ButtonText>{isSubmitting ? "Adding..." : "Add Progress"}</ButtonText>
      </Button>
    </Screen>
  );
}

export default function CreateTargetLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetId = params.targetId as string;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<TargetLogFormValues, any, TargetLogInput>({
    defaultValues: {
      amount: 0,
      notes: "",
      entryDate: "",
    },
    resolver: zodResolver(TargetLogInputSchema),
  });

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
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to add progress. Please try again."),
      );
    },
  });

  const onSubmit = (payload: TargetLogInput) => {
    setSubmitError(null);
    mutation.mutate(payload);
  };

  return (
    <TargetLogForm
      form={form}
      onSubmit={onSubmit}
      submitError={submitError}
      isSubmitting={mutation.isPending}
    />
  );
}
