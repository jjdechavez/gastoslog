import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";
import { useOnlineStatus } from "@/services/offline/useOnlineStatus";

// Small, unobtrusive bar shown while the device has no connectivity, so users
// know the data on screen is whatever was last cached rather than live.
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <ThemedView
      style={{
        backgroundColor: PicoColors["red-50"],
        paddingVertical: 8,
        paddingHorizontal: PicoThemeVariables.spacing,
        alignItems: "center",
      }}
    >
      <ThemedText
        type="small"
        style={{ color: PicoColors["red-800"], textAlign: "center" }}
      >
        You&apos;re offline — showing saved data
      </ThemedText>
    </ThemedView>
  );
}
