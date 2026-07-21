import { ofetch } from "ofetch";
import * as SecureStore from "expo-secure-store";

const AUTH_ENDPOINTS = ["/auth/sign-in", "/auth/sign-up", "/auth/refresh-token"];

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
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

      const retryOptions = { ...options };
      retryOptions.headers = new Headers(options.headers);
      retryOptions.headers.set("Authorization", `Bearer ${newToken}`);

      const retried = await ofetch.raw(request, retryOptions);
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
