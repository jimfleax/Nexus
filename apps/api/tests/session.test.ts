import { describe, it, expect, vi } from "vitest";
import { SessionManager } from "../src/utils/session.js";
import { FastifyReply, FastifyRequest } from "fastify";

describe("SessionManager", () => {
  describe("getAuthToken", () => {
    it("should extract token from Bearer header", () => {
      const mockRequest = {
        headers: { authorization: "Bearer token123" },
        cookies: {},
      } as unknown as FastifyRequest;

      expect(SessionManager.getAuthToken(mockRequest)).toBe("token123");
    });

    it("should extract token from nexus-session cookie if no Bearer header", () => {
      const mockRequest = {
        headers: {},
        cookies: { "nexus-session": "cookie-token" },
      } as unknown as FastifyRequest;

      expect(SessionManager.getAuthToken(mockRequest)).toBe("cookie-token");
    });

    it("should prefer Bearer header over cookie", () => {
      const mockRequest = {
        headers: { authorization: "Bearer token123" },
        cookies: { "nexus-session": "cookie-token" },
      } as unknown as FastifyRequest;

      expect(SessionManager.getAuthToken(mockRequest)).toBe("token123");
    });

    it("should return null if neither is present", () => {
      const mockRequest = {
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      expect(SessionManager.getAuthToken(mockRequest)).toBeNull();
    });
  });

  describe("State Management (OAuth / Integrations)", () => {
    it("should set OAuth state cookie", () => {
      const mockReply = {
        cookie: vi.fn(),
      } as unknown as FastifyReply;

      SessionManager.setOAuthState(mockReply, "state-123");
      expect(mockReply.cookie).toHaveBeenCalledWith(
        "oauth_state",
        "state-123",
        expect.objectContaining({
          httpOnly: true,
          maxAge: 300,
          sameSite: "none",
          path: "/",
        }),
      );
    });

    it("should get OAuth state", () => {
      const mockRequest = {
        cookies: { oauth_state: "state-123" },
      } as unknown as FastifyRequest;
      expect(SessionManager.getOAuthState(mockRequest)).toBe("state-123");
    });

    it("should clear OAuth state", () => {
      const mockReply = {
        clearCookie: vi.fn(),
      } as unknown as FastifyReply;

      SessionManager.clearOAuthState(mockReply);
      expect(mockReply.clearCookie).toHaveBeenCalledWith(
        "oauth_state",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "none",
          path: "/",
        }),
      );
    });

    it("should set Integration state cookie", () => {
      const mockReply = {
        cookie: vi.fn(),
      } as unknown as FastifyReply;

      SessionManager.setIntegrationState(mockReply, "int-123");
      expect(mockReply.cookie).toHaveBeenCalledWith(
        "integration_state",
        "int-123",
        expect.objectContaining({
          httpOnly: true,
          maxAge: 300,
        }),
      );
    });

    it("should clear Integration state", () => {
      const mockReply = {
        clearCookie: vi.fn(),
      } as unknown as FastifyReply;

      SessionManager.clearIntegrationState(mockReply);
      expect(mockReply.clearCookie).toHaveBeenCalledWith(
        "integration_state",
        expect.any(Object),
      );
    });
  });
});
