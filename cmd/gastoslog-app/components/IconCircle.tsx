import { View, type ViewProps } from "react-native";

import { useThemeColor, type ColorName } from "@/hooks/useThemeColor";

export type IconCircleProps = ViewProps & {
  size?: number;
  backgroundColor?: string;
  colorToken?: ColorName;
};

export function IconCircle({
  children,
  style,
  size = 32,
  backgroundColor,
  colorToken = "cardBackground",
  ...rest
}: IconCircleProps) {
  const tokenColor = useThemeColor({}, colorToken);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: backgroundColor ?? tokenColor,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
