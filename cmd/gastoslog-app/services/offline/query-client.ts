import { QueryClient } from "@tanstack/react-query";

import { registerMutationDefaults } from "@/services/offline/mutation-defaults";

// Single app-wide QueryClient instance. Lives in its own module (rather than
// being constructed inline in app/_layout.tsx) so that other non-route
// modules — notably context/session.tsx, which needs to call
// `queryClient.clear()` on explicit sign-out — can import the same singleton
// without reaching into a route file.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long enough that persisted cache survives a cold restart between uses.
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 2,
    },
  },
});

// Must run before the persisted cache is restored (PersistQueryClientProvider
// in app/_layout.tsx) so a mutation that was paused offline and persisted
// across a cold restart has a mutationFn/onMutate to resume with — react
// query cannot serialize functions into storage, only the mutationKey.
// Registering it here, as an import-time side effect of this module, means
// it always runs exactly once, before any consumer (RootLayout) can render
// the persist provider.
registerMutationDefaults(queryClient);
