import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  frontendUrl,
  generateState,
  exchangeCodeForToken,
} from "../src/utils/oauth.js";

describe("oauth-utils", () => {
  describe("frontendUrl", () => {
    let origFrontendUrl: string | undefined;

    beforeEach(() => {
      origFrontendUrl = process.env.FRONTEND_URL;
    });

    afterEach(() => {
      process.env.FRONTEND_URL = origFrontendUrl;
    });

    it("should return default if undefined", () => {
      delete process.env.FRONTEND_URL;
      expect(frontendUrl()).toBe("http://localhost:3000");
    });

    it("should strip trailing slashes", () => {
      process.env.FRONTEND_URL = "https://example.com/";
      expect(frontendUrl()).toBe("https://example.com");
    });
  });

  describe("generateState", () => {
    it("should return a 32-char hex string", () => {
      const state = generateState();
      expect(state).toHaveLength(32);
    });
  });

  describe("exchangeCodeForToken", () => {
    it("should POST form-encoded payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });
      global.fetch = mockFetch;

      await exchangeCodeForToken(
        "https://example.com/token",
        {
          code: "my-code",
          clientId: "my-client",
          clientSecret: "my-secret",
          redirectUri: "my-redirect",
        },
        { Accept: "application/json" },
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://example.com/token");
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded",
      );
      expect(opts.headers["Accept"]).toBe("application/json");

      const body = opts.body as URLSearchParams;
      expect(body.get("code")).toBe("my-code");
      expect(body.get("client_id")).toBe("my-client");
      expect(body.get("client_secret")).toBe("my-secret");
    });
  });
});
