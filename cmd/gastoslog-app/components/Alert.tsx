import { View, Text, TouchableOpacity } from "react-native";
import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import { useState } from "react";

export type AlertProps = {
  type: "info" | "success" | "error";
  message: string;
};

const mapColors = new Map([
  [
    "success",
    {
      backgroundColor: PicoColors["lime-50"],
      color: PicoColors["lime-800"],
      iconColor: PicoColors["lime-500"],
    },
  ],
  [
    "error",
    {
      backgroundColor: PicoColors["red-50"],
      color: PicoColors["red-800"],
      iconColor: PicoColors["red-500"],
    },
  ],
]);

export function Alert(props: AlertProps) {
  const color = mapColors.get(props.type);
  const [display, setDisplay] = useState<"idle" | "show" | "hidden">("idle");

  return display === "hidden" ? null : (
    <ThemedView
      style={{
        backgroundColor: color?.backgroundColor,
        padding: 16,
        borderRadius: PicoThemeVariables.borderRadius,
      }}
    >
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View>
          <Text style={{ color: color?.color }}>{props.message}</Text>
        </View>

        <TouchableOpacity
          style={{ marginLeft: "auto", paddingLeft: 16 }}
          onPress={() => setDisplay("hidden")}
        >
          <IconSymbol name="xmark" color={color!.iconColor} size={20} />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}
