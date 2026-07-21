import { View, type ViewProps, type FlexStyle } from "react-native";

export type RowProps = ViewProps & {
  justify?: FlexStyle["justifyContent"];
  align?: FlexStyle["alignItems"];
  gap?: number;
  wrap?: boolean;
};

export function Row({
  children,
  style,
  justify = "space-between",
  align = "center",
  gap,
  wrap = false,
  ...rest
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent: justify,
          alignItems: align,
          flexWrap: wrap ? "wrap" : "nowrap",
          gap,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
