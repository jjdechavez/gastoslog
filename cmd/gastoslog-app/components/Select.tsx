import React from "react";
import { Picker, type PickerProps } from "@react-native-picker/picker";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

export interface SelectProps extends PickerProps {
  options: Array<{ label: string; value: any }>;
  hasError?: boolean;
}

export const Select = React.forwardRef<Picker<{}>, SelectProps>(
  (props, ref) => {
    const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
    const borderColor = useThemeColor({}, "borderColor");
    const invalidBorderColor = useThemeColor({}, "formElementInvalidBorder");
    const color = useThemeColor({}, "formElementColor");

    return (
      <Picker
        ref={ref}
        selectedValue={props.selectedValue}
        style={{
          marginBottom: PicoThemeVariables.spacing,
          paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
          paddingVertical: PicoThemeVariables.formElementSpacingVertical,
          backgroundColor,
          width: "100%",
          height:
            16 * PicoThemeVariables.lineHeight +
            PicoThemeVariables.formElementSpacingVertical * 2 +
            PicoThemeVariables.borderWidth * 2,
          color,
          borderWidth: PicoThemeVariables.borderWidth * 2,
          borderStyle: "solid",
          borderColor: props?.hasError ? invalidBorderColor : borderColor,
          borderRadius: PicoThemeVariables.borderRadius, // 4
          boxShadow: "none",
          fontWeight: PicoThemeVariables.fontWeight,
        }}
        {...props}
      >
        {(props.options || []).map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    );
  },
);
