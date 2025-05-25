import { ofetch } from "ofetch";
import * as SecureStore from "expo-secure-store";

export const request = ofetch.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 3000,
  async onRequest({ request, options }) {
    console.log("[fetch request]", request, options);
    const token = await SecureStore.getItemAsync("session");
    if (token) {
      options.headers.append("Authorization", `Bearer ${token}`);
    }
  },
  async onRequestError({ request, response }) {
    console.log(
      "[fetch request error]",
      request,
      response?.status,
      response?.body,
    );
  },
  async onResponse({ request, response, options }) {
    console.log("[fetch response]", request, options);
    if (response._data?.token) {
      options.headers.append("Authorization", `Bearer ${response._data.token}`);
    }
  },
});
