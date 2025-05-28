import { type ViewProps, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";
import { H2 } from "./H";

export function HGroup({
  title,
  subtitle,
  style,
  ...otherProps
}: ViewProps & { title: string; subtitle?: string }) {
  const subtitleColor = useThemeColor({}, "textMuted");

  let subtitleContent = null;
  if (subtitle) {
    subtitleContent = (
      <ThemedText style={[styles.child, { color: subtitleColor }]}>
        {subtitle}
      </ThemedText>
    );
  }

  return (
    <ThemedView style={[styles.base, style]} {...otherProps}>
      <H2 style={[styles.child]}>{title}</H2>
      {subtitleContent}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  base: {
    marginBottom: PicoThemeVariables.typographySpacingVertical,
  },
  child: {
    marginBottom: 0,
    marginTop: 0,
  },
  lastChild: {
    // fontWeight: "200"
  },
});
