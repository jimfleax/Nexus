import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../src/auth.js";

describe("Health Route Access", () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify();
    app.register(authPlugin);

    app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
    app.get("/api/protected", async (request: any) => ({
      ok: true,
      user: request.ownerId,
    }));

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200 without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      ok: true,
      version: "0.1.0",
    });
  });

  it("GET /api/protected still returns 401 without authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/api/protected" });

    expect(response.statusCode).toBe(401);
  });
});
