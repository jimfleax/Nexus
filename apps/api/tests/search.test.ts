import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ResourceModel } from "../src/models/Resource.js";
import { searchRoutes } from "../src/routes/search.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

describe("Search Routes", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [searchRoutes] });

    await ResourceModel.init();

    await inTenant("test-user-1", async () => {
      await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Unique Search Title",
        type: "pdf",
        ownerId: "test-user-1",
        isFavorite: true,
        lastOpenedAt: new Date(),
      });

      await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Another Resource",
        type: "markdown",
        ownerId: "test-user-1",
        isFavorite: false,
      });
    });

    await inTenant("test-user-2", async () => {
      await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Hidden Unique Search Title",
        type: "pdf",
        ownerId: "test-user-2",
        isFavorite: true,
      });
    });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("GET /api/search should return resources matching query", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/search?q=Unique",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Unique Search Title");
  });

  it("GET /api/search/suggestions should return titles matching regex", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/search/suggestions?q=another",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Another Resource");
  });

  it("GET /api/favorites should return favorited resources", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/favorites",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Unique Search Title");
    expect(data[0].isFavorite).toBe(true);
  });

  it("GET /api/recent should return resources sorted by lastOpenedAt", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/recent",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Unique Search Title");
  });
});
