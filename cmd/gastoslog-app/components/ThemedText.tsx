import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoThemeVariables } from "@/styles/pico-lime";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "defaultSemiBold"
    | "subtitle"
    | "link"
    | "muted"
    | "caption"
    | "small"
    | "label";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Text
      style={[
        // styles.base,
        { color },
        type === "default" ? styles.default : undefined,
        type === "title" ? styles.title : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "subtitle" ? styles.subtitle : undefined,
        type === "link" ? styles.link : undefined,
        type === "muted" ? { color: textMuted } : undefined,
        type === "caption" ? [styles.caption, { color: textMuted }] : undefined,
        type === "small" ? styles.small : undefined,
        type === "label" ? styles.label : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    marginTop: 0,
    marginBottom: PicoThemeVariables.typographySpacingVertical,
  },
  default: {
    fontSize: 16,
    // lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    // lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: "#0a7ea4",
  },
  caption: {
    fontSize: 12,
  },
  small: {
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
});
