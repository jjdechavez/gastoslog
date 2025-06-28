import { ScrollView, View, type ViewProps } from "react-native";

import { ColorName, useThemeColor } from "@/hooks/useThemeColor";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "default" | "card";
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = "default",
  ...otherProps
}: ThemedViewProps) {
  let backgroundColorRef: ColorName = "background";
  if (variant === "card") {
    backgroundColorRef = "cardBackground";
  }
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    backgroundColorRef,
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function TScrollView({
  style,
  lightColor,
  darkColor,
  variant = "default",
  ...otherProps
}: ThemedViewProps) {
  let backgroundColorRef: ColorName = "background";
  if (variant === "card") {
    backgroundColorRef = "cardBackground";
  }
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    backgroundColorRef,
  );

  return <ScrollView style={[{ backgroundColor }, style]} {...otherProps} />;
}
