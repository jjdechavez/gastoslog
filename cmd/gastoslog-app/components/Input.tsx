import React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { ErrorMessage } from "@hookform/error-message";

import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";

type InputErrorProps = {
  errors?: { [x: string]: unknown };
  name?: string;
};

export function InputError({ errors, name }: InputErrorProps) {
  if (!errors || !name) {
    return null;
  }

  const color = useThemeColor({}, "textDeletedColor");

  return (
    <ErrorMessage
      name={name}
      errors={errors}
      render={({ message }) => {
        return (
          <ThemedText
            style={[
              {
                width: "100%",
                marginTop: PicoThemeVariables.spacing * -0.75,
                marginBottom: PicoThemeVariables.spacing,
                color,
                fontSize: PicoThemeVariables.fontSmallSize,
              },
            ]}
          >
            {message}
          </ThemedText>
        );
      }}
    />
  );
}

export interface InputProps extends TextInputProps {
  hasError?: boolean;
  isLoading?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>((props, ref) => {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const invalidBorderColor = useThemeColor({}, "formElementInvalidBorder");
  const color = useThemeColor({}, "formElementColor");
  const placeholderColor = useThemeColor({}, "formElementPlaceholderColor");

  return (
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
          borderColor: props?.hasError ? invalidBorderColor : borderColor,
          borderRadius: PicoThemeVariables.borderRadius, // 4
          backgroundColor,
          boxShadow: "none",
          fontWeight: PicoThemeVariables.fontWeight,
          // transi
        },
        props.isLoading ? { pointerEvents: "none" } : {},
        props.style,
      ]}
      placeholderTextColor={placeholderColor}
      {...props}
    />
  );
});
