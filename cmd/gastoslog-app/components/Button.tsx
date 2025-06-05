import { TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { ThemedText, ThemedTextProps } from "./ThemedText";
import { PicoThemeVariables } from "@/styles/pico-lime";

export function Button(props: TouchableOpacityProps) {
  return (
    <TouchableOpacity
      style={{
        margin: 0,
        overflow: "visible",
        paddingVertical: PicoThemeVariables.formElementSpacingVertical,
        paddingHorizontal: PicoThemeVariables.formElementSpacingVertical,

        borderWidth: PicoThemeVariables.borderWidth,
        borderStyle: "solid",
        borderColor: PicoThemeVariables.primaryInverse,
        borderRadius: PicoThemeVariables.borderRadius,

        outline: "none",
        backgroundColor: PicoThemeVariables.primaryBackground,
        boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
      }}
      {...props}
    >
      {props.children}
    </TouchableOpacity>
  );
}
export function ButtonText(props: ThemedTextProps) {
  return (
    <ThemedText
      style={{
        fontFamily: "inherit",
        textTransform: "none",
        color: PicoThemeVariables.primaryInverse,
        fontWeight: PicoThemeVariables.fontWeight,
        fontSize: 16,
        // lineHeight
        textAlign: "center",
        textDecorationColor: "none",
        cursor: "pointer",
        // transition
      }}
      {...props}
    />
  );
}
