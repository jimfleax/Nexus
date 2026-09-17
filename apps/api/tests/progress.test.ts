import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createTestApp,
  teardownTestApp,
  type TestAppContext,
} from "./helpers.js";
import { PdfProgressModel } from "../src/models/PdfProgress.js";
// Note: This import will fail until we create the routes
import { progressRoutes } from "../src/routes/progress.js";

describe("Progress Routes", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({
      routes: [progressRoutes],
    });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await PdfProgressModel.deleteMany({}, { skipTenant: true });
  });

  it("should upsert progress via POST /api/progress", async () => {
    const payload = {
      documentUrl: "/docs/example.pdf",
      currentPage: 3,
      maxPageReached: 3,
    };

    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/progress",
      payload,
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.documentUrl).toBe("/docs/example.pdf");
    expect(data.currentPage).toBe(3);

    const dbRecord = await PdfProgressModel.findOne(
      { documentUrl: "/docs/example.pdf" },
      undefined,
      { skipTenant: true },
    );
    expect(dbRecord).toBeDefined();
    expect(dbRecord?.currentPage).toBe(3);
  });
});
