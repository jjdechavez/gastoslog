import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { PicoColors } from "@/styles/pico-lime";

// Small pill shown next to an optimistic (not-yet-synced) row — e.g. an
// expense or category created while offline — so the "this hasn't reached
// the server yet" state reads clearly without dimming the whole row.
// Shared between app/(auth)/(tabs)/expense.tsx and
// app/(auth)/category/index.tsx (don't duplicate; extend here instead).
export function PendingTag() {
  return (
    <View style={styles.pendingTag}>
      <IconSymbol name="clock" size={11} color={PicoColors["lime-500"]} />
      <ThemedText style={styles.pendingTagText}>Pending</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PicoColors["lime-50"],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pendingTagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: PicoColors["lime-800"],
  },
});
