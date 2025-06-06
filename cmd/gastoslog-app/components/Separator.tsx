import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { IStyle } from "./base";
import { PicoThemeVariables } from "@/styles/pico-lime";

interface ISeparatorProps extends IStyle<ViewStyle> {}

export const Separator: React.FC<ISeparatorProps> = ({
  children,
  ...style
}) => {
  return (
    <View style={[separatorStyle.separator, style as ViewStyle]}>
      {children}
    </View>
  );
};

const separatorStyle = StyleSheet.create({
  separator: {
    height: 0,
    marginVertical: PicoThemeVariables.typographySpacingVertical,
    marginHorizontal: 0,
    borderTopWidth: PicoThemeVariables.borderWidth,
    borderTopColor: PicoThemeVariables.mutedBorderColor,
    color: "inherit",
  },
});
