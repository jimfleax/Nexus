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

describe("Token extraction", () => {
  it("extracts valid bearer token and sets ownerId", async () => {
    const token = await mint({ sub: "user-1" });
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, user: "user-1" });
  });

  it("extracts valid cookie token and sets ownerId", async () => {
    const token = await mint({ sub: "user-cookie" });
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { cookie: `nexus-session=${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, user: "user-cookie" });
  });

  it("prioritizes Bearer token over cookie", async () => {
    const bearerToken = await mint({ sub: "user-bearer" });
    const cookieToken = await mint({ sub: "user-cookie" });
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: {
        authorization: `Bearer ${bearerToken}`,
        cookie: `nexus-session=${cookieToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, user: "user-bearer" });
  });
});

describe("Invalid or missing tokens", () => {
  it("rejects missing tokens", async () => {
    const res = await app.inject({ method: "GET", url: "/api/protected" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized: Missing or invalid token");
  });

  it("rejects non-Bearer authorization header", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { authorization: "Basic abc" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects malformed token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { authorization: "Bearer not.a.jwt" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized: Invalid token");
  });

  it("rejects token missing sub", async () => {
    const token = await mint({ email: "x@y.z" }); // no sub
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized: Missing sub in token");
  });
});
