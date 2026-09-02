import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../src/auth.js";
import { tenantContext } from "../src/db.js";
import { SignJWT } from "jose";

let app: ReturnType<typeof Fastify>;

const secret = "test-secret-12345678901234567890";
const key = new TextEncoder().encode(secret);

const mint = async (claims: Record<string, unknown>, opts?: { exp?: number }) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts?.exp ?? Math.floor(Date.now() / 1000) + 3600)
    .sign(key);

beforeAll(async () => {
  process.env.AUTH_SECRET = secret;
  app = Fastify();
  app.register(authPlugin);

  app.get("/api/protected", async (request: any) => {
    return {
      ok: true,
      user: request.ownerId,
      storeUser: tenantContext.getStore()?.ownerId,
    };
  });

  app.get("/api/something", async (request: any) => ({
    ok: true,
    user: request.ownerId,
  }));
  app.get("/api/auth/something", async () => ({ ok: true, bypassed: true }));
  app.get("/health", async () => ({ ok: true }));

  await app.ready();
});

afterAll(async () => {
  await app.close();
});
