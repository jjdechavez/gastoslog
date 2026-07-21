import { useCreateTargetLog } from "@/services/api-hook/target";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { TargetLogInputSchema, type TargetLogInput } from "@/types/target";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod/v4";
import { TargetLogForm } from "@/components/TargetLogForm";

export type TargetLogFormValues = z.input<typeof TargetLogInputSchema>;

export default function CreateTargetLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetId = params.targetId as string;
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
      if (!isMountedRef.current) {
        return;
      }
      router.push({
        pathname: "/(auth)/target/[targetId]",
        params: {
          targetId,
          success: "Progress has been added!",
        },
      });
    },
    onError: (error) => {
      if (!isMountedRef.current) {
        return;
      }
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to add progress. Please try again."),
      );
    },
  });

  const onSubmit = (payload: TargetLogInput) => {
    setSubmitError(null);
    mutation.mutate(payload);

    if (!isOnline) {
      // Offline: the mutation pauses (networkMode: "online") and only
      // resumes once connectivity returns, so the onSuccess above won't fire
      // now — navigate right away so the user isn't left staring at the form
      // after tapping "Add". The optimistic row already appeared in the logs
      // list via onMutate.
      router.push({
        pathname: "/(auth)/target/[targetId]",
        params: {
          targetId,
          // Kept short — the persistent "waiting to sync" pill already
          // communicates the sync status, so repeating it here would be
          // redundant.
          success: "Progress saved offline",
        },
      });
    }
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
