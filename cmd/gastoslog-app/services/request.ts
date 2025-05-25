import { ofetch } from "ofetch";
import * as SecureStore from "expo-secure-store";

let refreshingToken = false;
let requestsQueue: { resolve: any; reject: any }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  requestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  requestsQueue = [];
};

export const request = ofetch.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
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
    // Handle retry mechanism when accessToken expired with refresh token (NOTE not implemented yet)
    if (response.status === 401) {
      if (refreshingToken) {
        return new Promise((resolve, reject) => {
          requestsQueue.push({ resolve, reject });
        })
          .then((resp) => {
            if (resp) {
              ofetch(request, options);
            }
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      refreshingToken = true;
      const retry = new Promise((resolve, reject) => {
        ofetch
          .raw<string>("/auth/Refresh-Token", {
            baseURL: process.env.EXPO_PUBLIC_API_URL,
            method: "POST",
            credentials: "include",
          })
          .then((resp) => {
            processQueue(null, resp._data);
            resolve(this);
          })
          .catch((err) => {
            processQueue(err, null);
            // logout
            SecureStore.setItemAsync("session", "");
            reject(this);
          })
          .finally(() => {
            refreshingToken = false;
            // resolve(this)
          });
      });
      await retry;
    }
  },
});
