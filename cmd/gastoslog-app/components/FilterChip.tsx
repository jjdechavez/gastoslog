import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";

export type FilterChipProps = {
  label: string;
  /** Renders the "this filter is narrowing the list" state. */
  active?: boolean;
  onPress: () => void;
  /** When provided, renders a trailing ✕ that clears just this filter. */
  onClear?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * A compact filter control for a horizontal chip row.
 *
 * Exists so filters can sit in one scrollable row instead of stacking full-width
 * form inputs down the screen — three stacked inputs eat roughly a third of a
 * phone viewport before any content appears. A chip row costs one line and keeps
 * the active values visible next to each other.
 *
 * The active state deliberately uses a lime tint with dark text rather than the
 * solid brand fill that `OutlineButton` uses: solid lime with white text fails
 * contrast, and a full-width lime block competes with the FAB for attention.
 */
export function FilterChip({
  label,
  active = false,
  onPress,
  onClear,
  icon,
  style,
  accessibilityLabel,
}: FilterChipProps) {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const textColor = useThemeColor({}, "text");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active
          ? styles.chipActive
          : { backgroundColor, borderColor },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <ThemedText
        numberOfLines={1}
        style={[
          styles.label,
          active ? styles.labelActive : { color: textColor },
        ]}
      >
        {label}
      </ThemedText>

      {onClear ? (
        <Pressable
          onPress={onClear}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label}`}
          style={styles.clear}
        >
          <ThemedText
            style={[
              styles.clearGlyph,
              active ? styles.labelActive : { color: textColor },
            ]}
          >
            ✕
          </ThemedText>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** Compact variant for use inside a FilterChip's leading slot. */
export function ChipIcon({ children }: { children: ReactNode }) {
  return <View style={styles.icon}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // 44px minimum touch target (Android/iOS accessibility guidance).
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: PicoThemeVariables.borderWidth,
    borderStyle: "solid",
  },
  chipActive: {
    backgroundColor: PicoColors["lime-50"],
    borderColor: PicoColors["lime-500"],
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  labelActive: {
    color: PicoColors["lime-800"],
  },
  icon: {
    marginRight: -2,
  },
  clear: {
    marginLeft: 2,
    marginRight: -4,
    paddingHorizontal: 2,
  },
  clearGlyph: {
    fontSize: 12,
    fontWeight: "700",
  },
});