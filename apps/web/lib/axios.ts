/**
 * @file axios.ts
 * @description Configures the shared axios instance used for all authenticated API calls.
 * @architecture Points at the /api/v1 rewrite prefix and globally handles errors by toasting, and signs out on 401 responses.
 */

import axios from "axios";
import { toast } from "sonner";

/**
 * @constant {AxiosInstance} api
 * @description Axios instance for the Nexus backend, rooted at the /api/v1 route proxy.
 */
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

/**
 * @desc    Response interceptor that surfaces API errors and handles session expiry
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        toast.error("Session expired. Please sign in again.");
        fetch("/api/auth/signout", { method: "POST" })
          .then((res) => {
            if (res.ok) window.location.href = "/signin";
            else toast.error("Failed to sign out");
          })
          .catch(() => toast.error("Failed to sign out"));
      }
    } else if (error.response?.status !== 404) {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);
