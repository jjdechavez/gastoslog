import { useCreateTargetLog } from "@/services/api-hook/target";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { TargetLogInputSchema, type TargetLogInput } from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { useState } from "react";
import type { z } from "zod/v4";
import { TargetLogForm } from "@/components/TargetLogForm";

export type TargetLogFormValues = z.input<typeof TargetLogInputSchema>;

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
      action="create"
      form={form}
      onSubmit={onSubmit}
      submitError={submitError}
      isSubmitting={mutation.isPending}
    />
  );
}
