import { Alert } from "@/components/Alert";
import { Button, ButtonText } from "@/components/Button";
import { Fieldset, Label } from "@/components/Fieldset";
import { HGroup } from "@/components/HGroup";
import { DatePicker } from "@/components/DatePicker";
import { FormField } from "@/components/FormField";
import { InputError } from "@/components/Input";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Screen } from "@/components/Screen";
import { useCreateTarget } from "@/services/api-hook/target";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { TargetInputSchema, type TargetInput } from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod/v4";

const TARGET_TYPES = [
  { label: "Savings", value: "savings" },
  { label: "Debt", value: "debt" },
  { label: "Loan", value: "loan" },
] as const;

const TARGET_DIRECTIONS = [
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
] as const;

export type TargetFormValues = z.input<typeof TargetInputSchema>;

export function TargetForm({
  form,
  onSubmit,
  submitError,
  isSubmitting,
}: {
  form: UseFormReturn<TargetFormValues, any, TargetInput>;
  onSubmit: (input: TargetInput) => void;
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
      <HGroup title="New Target" />

      {submitError ? <Alert type="error" message={submitError} /> : null}

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
      <InputError name="type" errors={errors as Record<string, unknown>} />

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
      <InputError
        name="direction"
        errors={errors as Record<string, unknown>}
      />

      <Controller
        name="deadlineAt"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Deadline (Optional)" />
            <DatePicker
              value={value}
              onChange={(date) => onChange(date.toISOString())}
              placeholder="Select deadline"
              minimumDate={new Date()}
            />
          </Fieldset>
        )}
      />
      <InputError
        name="deadlineAt"
        errors={errors as Record<string, unknown>}
      />

      <Button onPressIn={onFormSubmit} disabled={isSubmitting}>
        <ButtonText>{isSubmitting ? "Creating..." : "Create Target"}</ButtonText>
      </Button>
    </Screen>
  );
}

export default function CreateTargetScreen() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // react-query does not scope a useMutation() hook's onSuccess/onError to
  // the component's lifetime (see app/(auth)/expense/create.tsx for the full
  // rationale): the create mutation can be paused offline and resumed long
  // after the user has navigated away from this screen, so guard against
  // firing router.push at that point.
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const form = useForm<TargetFormValues, any, TargetInput>({
    defaultValues: {
      name: "",
      targetAmount: undefined,
      type: "savings",
      direction: "inbound",
      deadlineAt: undefined,
    },
    resolver: zodResolver(TargetInputSchema),
  });

  const mutation = useCreateTarget({
    onSuccess: () => {
      if (!isMountedRef.current) {
        return;
      }
      router.push({
        pathname: "/(auth)/(tabs)/target",
        params: {
          success: "Target has been created!",
        },
      });
    },
    onError: (error) => {
      if (!isMountedRef.current) {
        return;
      }
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to create target. Please try again."),
      );
    },
  });

  const onSubmit = (payload: TargetInput) => {
    setSubmitError(null);
    mutation.mutate(payload);

    if (!isOnline) {
      // Offline: the mutation pauses (networkMode: "online") and only
      // resumes once connectivity returns, so the onSuccess above won't fire
      // now — navigate right away so the user isn't left staring at the form
      // after tapping "Create". The optimistic row already appeared in the
      // list via onMutate.
      router.push({
        pathname: "/(auth)/(tabs)/target",
        params: {
          // Kept short — the persistent "waiting to sync" pill on the target
          // list (PendingSyncBadge) already communicates the sync status, so
          // repeating it here would be redundant.
          success: "Target saved offline",
        },
      });
    }
  };

  return (
    <TargetForm
      form={form}
      onSubmit={onSubmit}
      submitError={submitError}
      isSubmitting={mutation.isPending}
    />
  );
}
