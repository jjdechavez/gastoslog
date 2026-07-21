import { createContext, useContext, useEffect } from "react";
import { useStorageState } from "@/hooks/useStorageState";
import { api } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { setUnauthorizedHandler } from "@/services/request";

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

  const signOut = async () => {
    setSession(null);
    setRefreshToken(null);
  };

  // Fires when request.ts fails to refresh the access token (expired/invalid
  // refresh token), so local state stays in sync with the cleared storage.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      setRefreshToken(null);
    });
    return () => setUnauthorizedHandler(null);
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
