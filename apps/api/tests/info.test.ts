import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { infoRoutes } from "../src/routes/info.js";
import { createTestApp, teardownTestApp, TestAppContext } from "./helpers.js";

describe("Info Routes", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [infoRoutes] });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("GET /api/info should return 400 without query params", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/info",
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /api/info should return 404 for non-existent project", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/info?type=project&id=64d39f60c4f8d21234567890",
    });

    expect(response.statusCode).toBe(404);
  });
});
