import { View, type ViewProps } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { PicoThemeVariables } from "@/styles/pico-lime";

export type ProgressRingProps = ViewProps & {
  value: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  progressColor?: string;
};

export function ProgressRing({
  children,
  style,
  value,
  size = 176,
  stroke = 12,
  trackColor = PicoThemeVariables.formElementBorder,
  progressColor = PicoThemeVariables.primaryColor,
  ...rest
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View
      style={[{ alignItems: "center", justifyContent: "center" }, style]}
      {...rest}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotateZ: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>

      {children ? (
        <View
          style={{
            position: "absolute",
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: (size * 0.68) / 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
