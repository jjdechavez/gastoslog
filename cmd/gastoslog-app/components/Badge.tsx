import { View, type ViewProps, type TextStyle } from "react-native";

import { ThemedText } from "./ThemedText";
import { PicoThemeVariables } from "@/styles/pico-lime";

export type BadgeVariant = "default" | "success" | "muted";

const VARIANT_STYLES: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
  default: {
    backgroundColor: PicoThemeVariables.secondaryBackground,
    color: "#fff",
  },
  success: {
    backgroundColor: PicoThemeVariables.primaryBackground,
    color: PicoThemeVariables.primaryInverse,
  },
  muted: {
    backgroundColor: PicoThemeVariables.formElementBorder,
    color: PicoThemeVariables.textColor,
  },
};

export type BadgeProps = ViewProps & {
  variant?: BadgeVariant;
  textStyle?: TextStyle;
};

export function Badge({
  children,
  style,
  textStyle,
  variant = "default",
  ...rest
}: BadgeProps) {
  const colors = VARIANT_STYLES[variant];

  return (
    <View
      style={[
        {
          backgroundColor: colors.backgroundColor,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 4,
        },
        style,
      ]}
      {...rest}
    >
      <ThemedText style={[{ fontSize: 12, color: colors.color }, textStyle]}>
        {children}
      </ThemedText>
    </View>
  );
}
