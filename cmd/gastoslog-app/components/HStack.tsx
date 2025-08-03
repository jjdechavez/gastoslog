import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { IStyle } from "./base";

interface IHStackProps extends IStyle<ViewStyle> {
  children?: React.ReactNode;
}

export const HStack: React.FC<IHStackProps> = ({ children, ...style }) => {
  return (
    <View style={[hstackStyle.container, style as ViewStyle]}>{children}</View>
  );
};

const hstackStyle = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
});
