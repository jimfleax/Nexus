/**
 * @file auth-middleware.test.ts
 * @description Tests for the auth middleware plugin — token extraction, cookie parsing,
 *              token validation, expiry, missing secret, and missing sub claim.
 * @architecture Uses a minimal Fastify app with authPlugin only (no DB needed).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import { authPlugin } from "../src/auth.js";

const SECRET = "test-auth-secret-for-middleware-1234";

function createApp(): FastifyInstance {
  const app = Fastify();
  app.register(authPlugin);

  // Public route
  app.get("/health", async () => ({ ok: true }));

  // Protected route
  app.get("/api/data", async (request: any) => ({
    ok: true,
    user: request.ownerId,
  }));

  return app;
}

describe("Auth Middleware", () => {
  let app: FastifyInstance;
  let originalAuthSecret: string | undefined;

  beforeAll(async () => {
    originalAuthSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = SECRET;
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (originalAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalAuthSecret;
    }
  });

  describe("Public routes", () => {
    it("GET /health should pass without auth", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Bearer token authentication", () => {
    it("should authenticate with valid Bearer token", async () => {
      const token = await new SignJWT({ sub: "user-bearer" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));

      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).user).toBe("user-bearer");
    });

    it("should return 401 for missing token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/data",
      });

      expect(res.statusCode).toBe(401);
    });

    it("should return 401 for invalid token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: { authorization: "Bearer invalid-token-here" },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should return 401 for expired token", async () => {
      // Create a token that expired 1 hour ago by setting exp explicitly
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
      const token = await new SignJWT({ sub: "user-expired", exp: oneHourAgo })
        .setProtectedHeader({ alg: "HS256" })
        .sign(new TextEncoder().encode(SECRET));

      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(401);
    });

    it("should return 401 when token has no sub claim", async () => {
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));

      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("Cookie-based authentication", () => {
    it("should authenticate from nexus-session cookie", async () => {
      const token = await new SignJWT({ sub: "user-cookie" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));

      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: {
          cookie: `nexus-session=${token}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).user).toBe("user-cookie");
    });

    it("should prefer Bearer token over cookie", async () => {
      const bearerToken = await new SignJWT({ sub: "user-bearer-pref" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));

      const cookieToken = await new SignJWT({ sub: "user-cookie-pref" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(SECRET));

      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: {
          authorization: `Bearer ${bearerToken}`,
          cookie: `nexus-session=${cookieToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).user).toBe("user-bearer-pref");
    });

    it("should return 401 for invalid cookie token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: {
          cookie: "nexus-session=invalid-token",
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("AUTH_SECRET configuration", () => {
    it("should return 500 when AUTH_SECRET is not set", async () => {
      const originalSecret = process.env.AUTH_SECRET;
      delete process.env.AUTH_SECRET;

      const tempApp = Fastify();
      tempApp.register(authPlugin);
      tempApp.get("/api/data", async () => ({ ok: true }));
      await tempApp.ready();

      const token = await new SignJWT({ sub: "user-test" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode("dummy"));

      const res = await tempApp.inject({
        method: "GET",
        url: "/api/data",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(500);

      await tempApp.close();
      process.env.AUTH_SECRET = originalSecret;
    });
  });
});
