import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

// Backed by react-query's onlineManager, which is itself wired to NetInfo in
// app/_layout.tsx. Server snapshot defaults to "online" to avoid a flash of
// the offline banner during SSR/initial hydration.
export function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
