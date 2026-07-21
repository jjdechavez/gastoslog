import type { ComponentProps } from "react";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { Link, type Href } from "expo-router";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewProps,
} from "react-native";

import { IconSymbol } from "./ui/IconSymbol";

type IconName = ComponentProps<typeof IconSymbol>["name"];

export type FloatingButtonProps = ViewProps & {
  href?: Href;
  onPress?: () => void;
  icon?: IconName;
  iconColor?: string;
  iconSize?: number;
};

/**
 * @example
 * <FloatingButton href="/(auth)/(tabs)/category/create" icon="plus" />
 *
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
export function FloatingButton({
  children,
  href,
  onPress,
  icon = "plus",
  iconColor = PicoThemeVariables.primaryColor,
  iconSize = 30,
  ...props
}: FloatingButtonProps) {
  let content = children;

  if (!content && href) {
    content = (
      <Link href={href} asChild push>
        <TouchableOpacity style={styles.button}>
          <IconSymbol name={icon} color={iconColor} size={iconSize} />
        </TouchableOpacity>
      </Link>
    );
  } else if (!content && onPress) {
    content = (
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <IconSymbol name={icon} color={iconColor} size={iconSize} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container} {...props}>
      {content}
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
