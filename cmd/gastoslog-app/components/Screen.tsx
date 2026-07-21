import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedViewProps } from "./ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoThemeVariables } from "@/styles/pico-lime";

export type ScreenProps = ThemedViewProps & {
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  contentContainerStyle?: ViewProps["style"];
};

export function Screen({
  children,
  style,
  contentContainerStyle,
  lightColor,
  darkColor,
  variant = "default",
  scroll = false,
  keyboardAvoiding = false,
  edges = ["top", "bottom", "left", "right"],
  ...otherProps
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    variant === "card" ? "cardBackground" : "background",
  );

  const paddingStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { padding: PicoThemeVariables.spacing },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, padding: PicoThemeVariables.spacing },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View
      style={[{ flex: 1, backgroundColor }, paddingStyle, style]}
      {...otherProps}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}
