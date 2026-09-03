import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  frontendUrl,
  cookieOptions,
  generateState,
  setStateCookie,
  getStateFromCookie,
  clearStateCookie,
  exchangeCodeForToken,
} from "../src/utils/oauth.js";
import { FastifyReply, FastifyRequest } from "fastify";

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

  describe("cookieOptions", () => {
    let origApiUrl: string | undefined;

    beforeEach(() => {
      origApiUrl = process.env.API_URL;
    });

    afterEach(() => {
      process.env.API_URL = origApiUrl;
    });

    it("should include Secure flag if https", () => {
      process.env.API_URL = "https://example.com";
      expect(cookieOptions()).toContain("Secure;");
    });

    it("should not include Secure flag if http", () => {
      process.env.API_URL = "http://localhost:8080";
      expect(cookieOptions()).not.toContain("Secure;");
    });
  });

  describe("generateState", () => {
    it("should return a 32-char hex string", () => {
      const state = generateState();
      expect(state).toHaveLength(32);
    });
  });

  describe("cookie setters/getters", () => {
    let headers: Record<string, string>;

    const mockReply = {
      header: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return mockReply;
      },
    } as unknown as FastifyReply;

    const mockRequest = {
      headers: {},
    } as unknown as FastifyRequest;

    beforeEach(() => {
      headers = {};
      mockRequest.headers = { cookie: "" };
    });

    it("should set state cookie", () => {
      setStateCookie(mockReply, "test_cookie", "12345");
      expect(headers["set-cookie"]).toMatch(/^test_cookie=12345;/);
    });

    it("should get state from cookie", () => {
      mockRequest.headers.cookie =
        "some_other=x; test_cookie=12345; yet_another=y";
      expect(getStateFromCookie(mockRequest, "test_cookie")).toBe("12345");
    });

    it("should return null if cookie not present", () => {
      mockRequest.headers.cookie = "some_other=x;";
      expect(getStateFromCookie(mockRequest, "test_cookie")).toBeNull();
    });

    it("should clear state cookie", () => {
      clearStateCookie(mockReply, "test_cookie");
      expect(headers["set-cookie"]).toMatch(/^test_cookie=;/);
      expect(headers["set-cookie"]).toMatch(/Max-Age=0/);
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
