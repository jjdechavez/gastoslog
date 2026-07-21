import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import { Button, ButtonText } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { EmptyState, LoadingState } from "@/components/ScreenState";
import {
  targetLogKeys,
  useTargetLog,
  useUpdateTargetLog,
} from "@/services/api-hook/target";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { fromCentToRegularPrice } from "@/services/string";
import { TargetLogInputSchema, type TargetLogInput } from "@/types/target";
import { TargetLogForm } from "@/components/TargetLogForm";

export default function EditTargetLogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { targetId, logId } = useLocalSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A log added while offline is rendered with a negative temp id (see
  // services/offline/mutation-defaults.ts) until the create mutation
  // resolves and the logs list is invalidated/refetched with the real
  // server id. There's nothing to fetch yet for a temp id — skip the
  // detail query and show an explanatory empty state instead of spinning
  // forever on LoadingState.
  const isTempLog = Number(logId) < 0;

  const { data, status } = useTargetLog(targetId as string, logId as string, {
    enabled: !isTempLog,
  });

  const form = useForm({
    defaultValues: {
      amount: 0,
      notes: "",
      entryDate: "",
    },
    resolver: zodResolver(TargetLogInputSchema),
  });

  useEffect(() => {
    if (data?.data) {
      form.reset({
        amount: fromCentToRegularPrice(data.data.amount),
        notes: data.data.notes,
        entryDate: data.data.entryDate,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data]);

  const mutation = useUpdateTargetLog(targetId as string, logId as string, {
    onSuccess: (updatedLog) => {
      queryClient.setQueryData(
        targetLogKeys.detail(targetId as string, logId as string),
        updatedLog,
      );
      router.push({
        pathname: "/(auth)/target/[targetId]",
        params: {
          targetId: targetId as string,
          success: "Progress has been updated!",
        },
      });
    },
    onError: (error) => {
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to update progress. Please try again."),
      );
    },
  });

  const onSubmit = (payload: TargetLogInput) => {
    setSubmitError(null);
    mutation.mutate(payload);
  };

  if (isTempLog) {
    return (
      <Screen>
        <EmptyState message="This entry hasn't finished syncing yet. Check back once it's online." />
        <Button onPressIn={() => router.back()}>
          <ButtonText>Go back</ButtonText>
        </Button>
      </Screen>
    );
  }

  if (status === "success") {
    return (
      <TargetLogForm
        action="edit"
        form={form}
        onSubmit={onSubmit}
        submitError={submitError}
        isSubmitting={mutation.isPending}
      />
    );
  }

  return <LoadingState />;
}
