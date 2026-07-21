import { ofetch } from "ofetch";
import * as SecureStore from "expo-secure-store";

const AUTH_ENDPOINTS = ["/auth/sign-in", "/auth/sign-up", "/auth/refresh-token"];

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RefreshedTokens = { session: string; refreshToken: string };
let onTokensRefreshed: ((tokens: RefreshedTokens) => void) | null = null;

export function setTokensRefreshedHandler(
  handler: ((tokens: RefreshedTokens) => void) | null,
) {
  onTokensRefreshed = handler;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const data = await ofetch<{ token: string; refresh_token: string }>(
    "/v1/auth/refresh-token",
    {
      baseURL: process.env.EXPO_PUBLIC_API_URL,
      method: "POST",
      body: { refresh_token: refreshToken },
    },
  );

  await SecureStore.setItemAsync("session", data.token);
  await SecureStore.setItemAsync("refreshToken", data.refresh_token);

  // SecureStore (above) is the source of truth for the HTTP layer, which reads
  // it fresh on every request. But context/session.tsx keeps an in-memory
  // mirror (useStorageState) that powers session/UI state; without this it
  // would drift to the old, now-expired JWT after a silent refresh. Notify it
  // so the two copies stay in sync.
  onTokensRefreshed?.({ session: data.token, refreshToken: data.refresh_token });

  return data.token;
}

// Ensures concurrent 401s trigger a single refresh call, not one per request.
function getRefreshedToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function clearSession() {
  await SecureStore.deleteItemAsync("session");
  await SecureStore.deleteItemAsync("refreshToken");
  onUnauthorized?.();
}

export const request = ofetch.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  timeout: 3000,
  async onRequest({ options }) {
    const token = await SecureStore.getItemAsync("session");
    if (token) {
      options.headers.append("Authorization", `Bearer ${token}`);
    }
  },
  async onRequestError({ request, error }) {
    console.log("[fetch request error]", request, error);
  },
  async onResponse({ request, response, options }) {
    const url = String(request);
    const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) =>
      url.includes(endpoint),
    );

    if (response.status !== 401 || isAuthEndpoint) {
      return;
    }

    try {
      const newToken = await getRefreshedToken();

      // Retry via the bare global ofetch with an EXPLICIT options object. Do
      // NOT spread `options` here: it carries this instance's onRequest/
      // onResponse hooks, and ofetch would re-run them on the retry —
      // onRequest would `append` a second (stale) Authorization header
      // (corrupting the token so the server 401s), and onResponse would
      // re-enter this refresh logic on that 401, causing an infinite
      // refresh loop.
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${newToken}`);

      const retried = await ofetch.raw(request, {
        method: options.method,
        // Already JSON-stringified by ofetch on the original request;
        // re-passing the string is safe (ofetch won't double-encode it).
        body: options.body,
        headers,
      });
      response._data = retried._data;
      Object.defineProperty(response, "status", {
        value: retried.status,
        configurable: true,
      });
    } catch (error) {
      await clearSession();
      throw error;
    }
  },
});
