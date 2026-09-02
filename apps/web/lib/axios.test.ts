/**
 * @file axios.test.ts
 * @description Tests for the axios interceptor behavior in lib/axios.ts.
 * @architecture Creates a fresh axios instance with the same interceptor logic
 *              for isolated testing. Uses vi.mock with import to access the mock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Mock sonner toast — import after mock to get the mocked version
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");

// Mock window and fetch for 401 tests
const mockFetch = vi.fn();
const mockLocation = { href: "" };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  mockLocation.href = "";

  // Mock window.location with a persistent object
  // @ts-expect-error - testing mock
  globalThis.window = { location: mockLocation };

  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

import { api } from "./axios";

function makeAxiosError(
  status: number,
  data: any = {},
  message = "Request failed",
): AxiosError {
  return {
    response: { status, data, headers: {}, config: {} as any, statusText: "" },
    message,
    config: {} as InternalAxiosRequestConfig,
    isAxiosError: true,
    code: "ERR_BAD_RESPONSE",
    name: "AxiosError",
    toJSON: () => ({}),
  } as AxiosError;
}

describe("Axios Response Interceptor", () => {
  it("should pass through successful responses", async () => {
    api.defaults.adapter = async (config) => ({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });

    const response = await api.get("/test");
    expect(response.data).toEqual({ ok: true });
    expect(response.status).toBe(200);
  });

  it("should show toast for 500 errors with server message", async () => {
    api.defaults.adapter = async () => {
      throw makeAxiosError(500, { error: "Internal Server Error" });
    };

    await expect(api.get("/test")).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith("Internal Server Error");
  });

  it("should show toast for 400 errors with server message", async () => {
    api.defaults.adapter = async () => {
      throw makeAxiosError(400, { error: "Invalid payload" });
    };

    await expect(api.get("/test")).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith("Invalid payload");
  });

  it("should NOT show toast for 404 errors", async () => {
    api.defaults.adapter = async () => {
      throw makeAxiosError(404, { error: "Not Found" });
    };

    await expect(api.get("/test")).rejects.toThrow();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("should handle 401 by showing toast and signing out", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    api.defaults.adapter = async () => {
      throw makeAxiosError(401, { error: "Unauthorized" });
    };

    await expect(api.get("/test")).rejects.toThrow();

    expect(toast.error).toHaveBeenCalledWith(
      "Session expired. Please sign in again.",
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
    });
  });

  it("should redirect to /signin after successful signout on 401", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    api.defaults.adapter = async () => {
      throw makeAxiosError(401);
    };

    await expect(api.get("/test")).rejects.toThrow();

    // Wait for the async signout flow (fetch + redirect)
    await new Promise((r) => setTimeout(r, 50));

    expect(mockLocation.href).toBe("/signin");
  });

  it("should show toast when signout fails on 401", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    api.defaults.adapter = async () => {
      throw makeAxiosError(401);
    };

    await expect(api.get("/test")).rejects.toThrow();

    // Wait for the async signout flow
    await new Promise((r) => setTimeout(r, 10));

    expect(toast.error).toHaveBeenCalledWith("Failed to sign out");
  });

  it("should show generic message when no server error message", async () => {
    api.defaults.adapter = async () => {
      const error = makeAxiosError(500, {});
      error.message = "Network Error";
      throw error;
    };

    await expect(api.get("/test")).rejects.toThrow();
    expect(toast.error).toHaveBeenCalledWith("Network Error");
  });
});
