import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";

import { CategoryInputSchema, type CategoryInput } from "@/types/category";
import { useCreateCategory } from "@/services/api-hook/category";
import { applyServerFieldErrors, getErrorMessage } from "@/services/errors";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";
import { useRouter } from "expo-router";
import { CategoryForm, type CategoryFormValues } from "./[categoryId]/edit";

export default function CreateCategoryScreen() {
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

  const form = useForm<CategoryFormValues, any, CategoryInput>({
    defaultValues: { name: "", description: "" },
    resolver: zodResolver(CategoryInputSchema),
  });

  const mutation = useCreateCategory({
    onSuccess: () => {
      if (!isMountedRef.current) {
        return;
      }
      router.push({
        pathname: "/(auth)/category",
        params: {
          success: "Category has been created!",
        },
      });
    },
    onError: (error) => {
      if (!isMountedRef.current) {
        return;
      }
      applyServerFieldErrors(error, form);
      setSubmitError(
        getErrorMessage(error, "Unable to create category. Please try again."),
      );
    },
  });

  const onSubmit = (payload: CategoryInput) => {
    setSubmitError(null);
    mutation.mutate(payload);

    if (!isOnline) {
      // Offline: the mutation pauses (networkMode: "online") and only
      // resumes once connectivity returns, so the onSuccess above won't fire
      // now — navigate right away so the user isn't left staring at the form
      // after tapping "Create". The optimistic row already appeared in the
      // list via onMutate.
      router.push({
        pathname: "/(auth)/category",
        params: {
          success: "Category saved offline",
        },
      });
    }
  };

  return (
    <CategoryForm
      action="create"
      form={form}
      onSubmit={onSubmit}
      submitError={submitError}
      isSubmitting={mutation.isPending}
    />
  );
}
