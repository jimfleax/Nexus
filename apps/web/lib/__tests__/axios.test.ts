import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast } from "sonner";
import { api } from "../axios";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorInterceptor = (api.interceptors.response as any).handlers[0]
  .rejected;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeError(status: number | undefined, data: any, message = "boom") {
  return {
    isAxiosError: true,
    message,
    response:
      status === undefined
        ? undefined
        : { status, data, statusText: "Error", headers: {}, config: {} },
  };
}

describe("Axios Interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses response.data.error for toast message", async () => {
    const err = makeError(422, { error: "Custom!" });
    await expect(errorInterceptor(err)).rejects.toBe(err);
    expect(toast.error).toHaveBeenCalledWith("Custom!");
  });

  it("falls back to error.message when no data.error", async () => {
    const err = makeError(422, {}, "Network Error");
    await expect(errorInterceptor(err)).rejects.toBe(err);
    expect(toast.error).toHaveBeenCalledWith("Network Error");
  });

  it("is silent for 404", async () => {
    const err = makeError(404, { error: "not found" });
    await expect(errorInterceptor(err)).rejects.toBe(err);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not toast generic message on 401 (handled by signout branch)", async () => {
    const err = makeError(401, { error: "unauth" }, "Unauthorized");
    await expect(errorInterceptor(err)).rejects.toBe(err);
    expect(toast.error).not.toHaveBeenCalledWith("unauth");
    expect(toast.error).not.toHaveBeenCalledWith("Unauthorized");
  });

  describe("401 signout flow", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockWindow: any;

    beforeEach(() => {
      mockWindow = { location: { href: "" } };
      vi.stubGlobal("window", mockWindow);
    });

    it("toasts session expired, signs out, and redirects on 401", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const err = makeError(401, {});
      await expect(errorInterceptor(err)).rejects.toBe(err);

      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please sign in again.",
      );
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/signout", {
        method: "POST",
      });

      // Wait for async fetch `.then` to complete
      await vi.waitFor(() => {
        expect(mockWindow.location.href).toBe("/signin");
      });
    });

    it("toasts 'Failed to sign out' if signout response is not ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
      const err = makeError(401, {});
      await expect(errorInterceptor(err)).rejects.toBe(err);

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to sign out");
        expect(mockWindow.location.href).toBe("");
      });
    });

    it("toasts 'Failed to sign out' if fetch rejects", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
      const err = makeError(401, {});
      await expect(errorInterceptor(err)).rejects.toBe(err);

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to sign out");
      });
    });

    it("does nothing if window is undefined", async () => {
      vi.unstubAllGlobals(); // removes window
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const err = makeError(401, {});
      await expect(errorInterceptor(err)).rejects.toBe(err);

      expect(toast.error).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
