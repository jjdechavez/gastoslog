import { createContext, useContext, useEffect } from "react";
import { Alert } from "react-native";
import { useStorageState } from "@/hooks/useStorageState";
import { api } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import {
  setUnauthorizedHandler,
  setTokensRefreshedHandler,
} from "@/services/request";
import { queryClient } from "@/services/offline/query-client";
import { asyncStoragePersister } from "@/services/offline/persister";
import { EXPENSE_CREATE_MUTATION_KEY } from "@/services/offline/mutation-keys";

type SessionContextType = {
  isLoading: boolean;
  session: string | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [[isLoading, session], setSession] = useStorageState("session");
  const [, setRefreshToken] = useStorageState("refreshToken");

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api().auth.signIn(email, password);

      setSession(response.token);
      setRefreshToken(response.refresh_token);
      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return {
        success: false,
        error: getErrorMessage(error, "Unable to sign in. Please try again."),
      };
    }
  };

  const signUp = async (username: string, password: string) => {
    try {
      const response = await api().auth.signUp(username, password);

      setSession(response.token);
      return { success: true };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  // Count queued/failed create-expense mutations still sitting in the
  // mutation cache — these are writes that haven't made it to the server
  // yet (paused offline, mid-retry, or permanently errored) and would be
  // abandoned by an explicit sign-out (see the queryClient.clear() below).
  const countUnsyncedExpenses = () => {
    const mutations = queryClient
      .getMutationCache()
      .findAll({ mutationKey: EXPENSE_CREATE_MUTATION_KEY });
    return mutations.filter((mutation) => mutation.state.status !== "success")
      .length;
  };

  // Explicit, user-initiated sign-out. Clears local tokens AND the
  // query/mutation cache — unlike the failed-refresh path below, there is no
  // "same user will come back" assumption here (the user may sign in as
  // someone else next), so nothing should linger for the next account.
  // queryClient.clear() drops the in-memory cache; removeClient() drops the
  // on-disk persisted copy so a different account signing in during the same
  // app session can't be shown the previous user's data (the persist provider
  // does not remount on sign-in — see PersistedQueryProvider in app/_layout).
  const performSignOut = () => {
    setSession(null);
    setRefreshToken(null);
    queryClient.clear();
    asyncStoragePersister.removeClient();
  };

  const signOut = async () => {
    const unsyncedCount = countUnsyncedExpenses();
    if (unsyncedCount === 0) {
      performSignOut();
      return;
    }

    return new Promise<void>((resolve) => {
      Alert.alert(
        "Unsynced expenses",
        `You have ${unsyncedCount} unsynced expense${
          unsyncedCount === 1 ? "" : "s"
        } that will be lost if you sign out. Sign out anyway?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          {
            text: "Sign Out",
            style: "destructive",
            onPress: () => {
              performSignOut();
              resolve();
            },
          },
        ],
      );
    });
  };

  // Fires when request.ts fails to refresh the access token (expired/invalid
  // refresh token), so local state stays in sync with the cleared storage.
  // Deliberately does NOT call queryClient.clear() (contrast performSignOut
  // above): this path assumes the SAME user will likely re-authenticate —
  // e.g. their refresh token merely expired — so the persisted query cache
  // and any paused/queued mutations (the offline outbox) must survive this
  // transition. Clearing here would silently drop queued-offline expenses
  // that the user still expects to sync once they log back in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setRefreshToken(null);
    });
    // Keep in-memory session state aligned with tokens rotated by a silent
    // refresh in request.ts (which writes SecureStore directly). Without this
    // the React copy would keep the old, expired JWT after a background
    // refresh. The `sub` claim is unchanged across a refresh, so the persist
    // buster (getUserKeyFromToken) stays stable — no cache remount.
    setTokensRefreshedHandler(({ session, refreshToken }) => {
      setSession(session);
      setRefreshToken(refreshToken);
    });
    return () => {
      setUnauthorizedHandler(null);
      setTokensRefreshedHandler(null);
    };
  }, [setSession, setRefreshToken]);

  return (
    <SessionContext.Provider
      value={{ isLoading, session, signIn, signUp, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within an SessionProvider");
  }
  return context;
};
