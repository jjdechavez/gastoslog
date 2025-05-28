import { StyleSheet, type TextProps } from "react-native";

import { PicoThemeVariables } from "@/styles/pico-lime";
import { ThemedText } from "./ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";

const styles = StyleSheet.create({
  base: {
    // marginTop: 0,
    marginBottom: PicoThemeVariables.typographySpacingVertical,
    fontWeight: PicoThemeVariables.headerFontWeight,
    fontSize: PicoThemeVariables.fontSize,
    // lineHeight: PicoThemeVariables.lineHeight,
    fontFamily: PicoThemeVariables.fontFamily,
  },
});

export const H1 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h1");
  return (
    <ThemedText
      style={[
        styles.base,
        { color },
        style,
        {
          fontSize: 32,
          // lineHeight: 1.125,
          // spacing: 42
        },
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};

export const H2 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h2");
  return (
    <ThemedText
      style={[
        styles.base,
        {
          fontSize: 28,
          // lineHeight: 1.15,
        },
        { color },
        style,
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};

export const H3 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h3");
  return (
    <ThemedText
      style={[
        styles.base,
        { color },
        style,
        {
          fontSize: 24,
          // lineHeight: 1.175,
        },
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};

export const H4 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h4");
  return (
    <ThemedText
      style={[
        styles.base,
        { color },
        style,
        {
          fontSize: 20,
          // lineHeight: 1.2,
        },
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};

export const H5 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h5");
  return (
    <ThemedText
      style={[
        styles.base,
        { color },
        style,
        {
          fontSize: 18,
          // lineHeight: 1.2,
        },
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};

export const H6 = ({ children, style, ...otherProps }: TextProps) => {
  const color = useThemeColor({}, "h6");
  return (
    <ThemedText
      style={[
        styles.base,
        { color },
        style,
        {
          fontSize: 16,
          // lineHeight: 1.25,
        },
      ]}
      {...otherProps}
    >
      {children}
    </ThemedText>
  );
};
