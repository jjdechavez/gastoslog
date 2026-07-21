import * as SecureStore from "expo-secure-store";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Manual base64 (RFC 4648 / JWT "base64url") decoder — avoids relying on a
// global `atob`, which isn't guaranteed across Hermes/RN versions, and avoids
// pulling in a new dependency just to read a JWT payload.
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");

  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = BASE64_CHARS.indexOf(clean[i]);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch (error) {
    console.error("Failed to decode JWT payload:", error);
    return null;
  }
}

// Derives a stable per-user cache-buster directly from a JWT (if any),
// without touching SecureStore. Callers that already hold the token — e.g.
// context/session.tsx, which keeps it in React state — should use this
// instead of getSessionUserKey() so the key can be recomputed reactively
// whenever that state changes, rather than only once via an async read.
// Falls back to a neutral key when there's no token (or it can't be parsed).
export function getUserKeyFromToken(token: string | null): string {
  if (!token) return "anon";

  const payload = decodeJwtPayload(token);
  if (!payload || payload.sub == null) return "anon";

  return String(payload.sub);
}

// Derives a stable per-user cache-buster from the session JWT's `sub` claim,
// so the persisted react-query cache is scoped to the signed-in account and
// gets discarded automatically when a different user signs in. Falls back to
// a neutral key when there's no session (or it can't be parsed).
export async function getSessionUserKey(): Promise<string> {
  try {
    const token = await SecureStore.getItemAsync("session");
    return getUserKeyFromToken(token);
  } catch (error) {
    console.error("Failed to resolve session user key:", error);
    return "anon";
  }
}
