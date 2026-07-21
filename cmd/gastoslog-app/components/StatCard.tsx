import type { ReactNode } from "react";
import type { ViewProps } from "react-native";

import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export type StatCardProps = ViewProps & {
  label: string;
  value: ReactNode;
  valueColor?: string;
};

export function StatCard({ label, value, valueColor, style, ...rest }: StatCardProps) {
  return (
    <ThemedView variant="card" style={style} {...rest}>
      <ThemedText type="subtitle">{label}</ThemedText>
      <ThemedText
        type="title"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </ThemedText>
    </ThemedView>
  );
}
