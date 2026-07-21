import { View, type ViewProps } from "react-native";

import { PicoThemeVariables } from "@/styles/pico-lime";

export type ProgressBarProps = ViewProps & {
  value: number;
  completed?: boolean;
  height?: number;
};

export function ProgressBar({
  style,
  value,
  completed = false,
  height = 8,
  ...rest
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <View
      style={[
        {
          height,
          backgroundColor: PicoThemeVariables.formElementBorder,
          borderRadius: height / 2,
          overflow: "hidden",
        },
        style,
      ]}
      {...rest}
    >
      <View
        style={{
          height: "100%",
          width: `${clamped}%`,
          borderRadius: height / 2,
          backgroundColor: completed
            ? PicoThemeVariables.primaryColor
            : PicoThemeVariables.primaryBackground,
        }}
      />
    </View>
  );
}
