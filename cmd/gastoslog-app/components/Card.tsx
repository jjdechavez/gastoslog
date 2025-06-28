import { PicoThemeVariables } from "@/styles/pico-lime";
import { ThemedView, type ThemedViewProps } from "./ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";

export function Card(props: ThemedViewProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");
  return (
    <ThemedView
      style={{
        marginBottom: PicoThemeVariables.blockSpacingVertical,
        paddingVertical: PicoThemeVariables.blockSpacingVertical,
        paddingHorizontal: PicoThemeVariables.blockSpacingHorizontal,
        borderRadius: PicoThemeVariables.borderRadius,
        backgroundColor,
      }}
    >
      {props.children}
    </ThemedView>
  );
}
