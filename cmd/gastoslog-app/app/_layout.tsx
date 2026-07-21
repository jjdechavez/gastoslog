import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { SessionProvider, useSession } from "@/context/session";
import { asyncStoragePersister } from "@/services/offline/persister";
import { getUserKeyFromToken } from "@/services/offline/user-key";
import { queryClient } from "@/services/offline/query-client";

// Lets react-query know about connectivity so it can pause/resume queries and
// mutations based on real network state instead of just browser "online".
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export default function RootLayout() {
  useReactQueryDevTools(queryClient);
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs briefly on startup.
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* SessionProvider sits ABOVE the persist provider so the current
          user's JWT is known here and PersistedQueryProvider can re-key
          (and thus re-hydrate/remount) whenever the signed-in account
          changes, instead of resolving a cache-buster once on mount. */}
      <SessionProvider>
        <PersistedQueryProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </PersistedQueryProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

// Wraps PersistQueryClientProvider and scopes the persisted cache to the
// signed-in user via `buster`, captured once when this provider first mounts
// (i.e. at app launch, keyed on whoever is logged in then).
//
// We deliberately do NOT force a remount when the user changes mid-session
// (no `key` prop): this provider wraps the navigator (<Stack>), and remounting
// it tears the navigation tree down and back up. A sign-in's
// `router.replace("/(auth)/(tabs)")` would then fire against a navigator that
// is mid-remount and throw "REPLACE ... was not handled by any navigator".
// (PersistQueryClientProvider only restores once per mount anyway — guarded by
// an internal `didRestore` ref — so a changing `buster` prop without a remount
// is a no-op; a remount was the only thing that re-keyed it, and it is exactly
// what broke navigation.)
//
// Cross-user separation is instead handled without touching the navigator:
//   • explicit sign-out clears in-memory + on-disk cache (queryClient.clear()
//     + persister.removeClient() in context/session.tsx), so the next account
//     never sees the previous one's data; and
//   • on the next cold start the launch-time buster is the new user's key, so
//     any cache still persisted under the old user's buster is discarded on
//     restore.
// Trade-off: if you sign in from a logged-out launch, that session persists
// under the launch-time ("anon") buster and is discarded on the next restart —
// a one-time loss of cache warmth, never a data leak. The common case (already
// logged in at launch) keys correctly and persists across restarts.
function PersistedQueryProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();

  if (isLoading) {
    // Briefly true while the session token is read from SecureStore on
    // startup — avoids hydrating once under a placeholder key and again
    // moments later under the real one.
    return null;
  }

  const userKey = getUserKeyFromToken(session);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: userKey,
        // Only persist paused (queued-offline) mutations, not settled ones —
        // a mutation that already succeeded or permanently failed has
        // nothing left to resume, so persisting it just bloats storage and
        // risks confusing resume/replay logic on the next restore.
        dehydrateOptions: { shouldDehydrateMutation: (m) => m.state.isPaused },
      }}
      // Fires once the persisted cache (including paused mutations) has been
      // restored — safe point to flush anything queued offline. Guarded on
      // `session` because this also fires for the signed-out ("anon")
      // buster (e.g. right after a failed token refresh, before the user
      // re-authenticates) — resuming then would fire an unauthenticated
      // request that's guaranteed to fail and roll back the optimistic row,
      // permanently losing the queued write instead of leaving it paused
      // for the user to re-login and retry.
      onSuccess={() => {
        if (session) {
          queryClient.resumePausedMutations();
        }
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
