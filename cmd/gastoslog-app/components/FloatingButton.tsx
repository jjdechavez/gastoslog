import { PicoThemeVariables } from "@/styles/pico-lime";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewProps,
} from "react-native";

/**
 * @example
 * <FloatingButton>
 *  <Link href="/(auth)/(tabs)/category/create" asChild push>
 *   <TouchableOpacity style={floatingButtonStyle.button}>
 *    <IconSymbol
 *     name="plus"
 *     color={PicoThemeVariables.primaryColor}
 *     size={30}
 *    />
 *   </TouchableOpacity>
 *  </Link>
 * </FloatingButton>
 *
 **/
export function FloatingButton({ children, ...props }: ViewProps) {
  return (
    <View style={styles.container} {...props}>
      {children}
    </View>
  );
}

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 35,
    right: 25,
  },
  button: {
    backgroundColor: PicoThemeVariables.primaryBackground,
    elevation: 5, // For Android shadow
    shadowColor: "#000", // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    zIndex: 1,
    height: 56,
    width: 56,
    borderRadius: 100,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
});
