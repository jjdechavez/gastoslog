import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedView } from "./ThemedView";
import { ThemedText } from "./ThemedText";

export interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>((props, ref) => {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const color = useThemeColor({}, "formElementColor");
  const placeholderColor = useThemeColor({}, "formElementPlaceholderColor");
  const labelColor = useThemeColor({}, "text");
  const requiredColor = useThemeColor({}, "formElementInvalidBorder");

  let label = null;
  if (props?.label) {
    let requiredContent = null;
    if (props?.required) {
      requiredContent = (
        <ThemedText
          style={{
            color: requiredColor,
          }}
        >
          *
        </ThemedText>
      );
    }
    label = (
      <ThemedText
        style={{
          marginBottom: PicoThemeVariables.spacing * 0.375,
          color: labelColor,
        }}
      >
        {props.label} {requiredContent}
      </ThemedText>
    );
  }

  return (
    <ThemedView>
      {label}
      <TextInput
        ref={ref}
        style={[
          {
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
          },
          props.style,
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
    </ThemedView>
  );
});
