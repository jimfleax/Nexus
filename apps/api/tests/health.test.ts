import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { createAuthTestApp } from "./helpers.js";

describe("Health Route Access", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createAuthTestApp();
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
