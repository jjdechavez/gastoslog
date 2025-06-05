import { TextInput, type TextInputProps } from "react-native";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

export function Input(props: TextInputProps) {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const color = useThemeColor({}, "formElementColor");
  const placeholderColor = useThemeColor({}, "formElementPlaceholderColor")

  return (
    <TextInput
      style={{
        marginBottom: PicoThemeVariables.spacing,
        paddingVertical: PicoThemeVariables.formElementSpacingVertical,
        paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
        width: "100%",
        height:
          16 * PicoThemeVariables.lineHeight +
          PicoThemeVariables.formElementSpacingVertical * 2 +
          PicoThemeVariables.borderWidth * 2,
        color,
        borderWidth: PicoThemeVariables.borderWidth,
        borderStyle: "solid",
        borderColor,
        borderRadius: PicoThemeVariables.borderRadius, // 4
        backgroundColor,
        boxShadow: "none",
        fontWeight: PicoThemeVariables.fontWeight,
        // transi
      }}
      placeholderTextColor={placeholderColor}
      {...props}
    />
  );
}
