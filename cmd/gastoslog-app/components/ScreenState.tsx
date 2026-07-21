import { ActivityIndicator, type ViewProps } from "react-native";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { PicoThemeVariables } from "@/styles/pico-lime";

type CenteredProps = ViewProps & {
  message?: string;
};

export function LoadingState({ message = "Loading...", style, ...rest }: CenteredProps) {
  return (
    <ThemedView style={[styles.centered, style]} {...rest}>
      <ActivityIndicator size="large" />
      {message ? (
        <ThemedText type="muted" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  style,
  ...rest
}: CenteredProps) {
  return (
    <ThemedView style={[styles.centered, style]} {...rest}>
      <ThemedText type="muted" style={styles.message}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

export function EmptyState({ message = "Nothing here yet.", style, ...rest }: CenteredProps) {
  return (
    <ThemedView style={[styles.empty, style]} {...rest}>
      <ThemedText type="muted">{message}</ThemedText>
    </ThemedView>
  );
}

export function ListFooterLoader({ loading }: { loading?: boolean }) {
  if (!loading) {
    return null;
  }
  return <ThemedText type="muted" style={styles.footer}>Loading...</ThemedText>;
}

type QueryLike = {
  isPending?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  status?: "pending" | "error" | "success";
};

type ScreenStateProps = {
  query: QueryLike;
  loadingMessage?: string;
  errorMessage?: string;
  children: React.ReactNode;
};

export function ScreenState({
  query,
  loadingMessage,
  errorMessage,
  children,
}: ScreenStateProps) {
  const isPending = query.status ? query.status === "pending" : (query.isPending ?? query.isLoading);
  const isError = query.status ? query.status === "error" : query.isError;

  if (isPending) {
    return <LoadingState message={loadingMessage} />;
  }

  if (isError) {
    return <ErrorState message={errorMessage} />;
  }

  return <>{children}</>;
}

const styles = {
  centered: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: PicoThemeVariables.spacing * 2,
  },
  empty: {
    padding: 32,
    alignItems: "center" as const,
  },
  message: {
    marginTop: 12,
    textAlign: "center" as const,
  },
  footer: {
    textAlign: "center" as const,
    paddingVertical: 12,
  },
};
