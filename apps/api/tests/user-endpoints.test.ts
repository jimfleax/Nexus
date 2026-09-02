import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ResourceModel } from "../src/models/Resource.js";
import { userRoutes } from "../src/routes/user.js";
import { resourceRoutes } from "../src/routes/resources.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

let ctx: TestAppContext;

describe("User Endpoints", () => {
  beforeAll(async () => {
    ctx = await createTestApp({ routes: [userRoutes, resourceRoutes] });

    // Setup data for user-1
    await inTenant("test-user-1", async () => {
      await ResourceModel.create([
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Fav 1",
          type: "note",
          isFavorite: true,
        },
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Not Fav 1",
          type: "note",
          isFavorite: false,
        },
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Fav 2",
          type: "note",
          isFavorite: true,
        },
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Recent 1",
          type: "note",
          lastOpenedAt: new Date(Date.now() - 1000),
        },
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Recent 2",
          type: "note",
          lastOpenedAt: new Date(Date.now() - 5000),
        },
      ]);
    });

    // Other user's data
    await inTenant("test-user-2", async () => {
      await ResourceModel.create([
        {
          projectId: "proj-1",
          listId: "list-1",
          title: "Fav User 2",
          type: "note",
          isFavorite: true,
        },
      ]);
    });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("GET /api/user/favorites returns only favorite resources for the user", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/user/favorites",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(2);
    expect(data.map((r: any) => r.title)).toContain("Fav 1");
    expect(data.map((r: any) => r.title)).toContain("Fav 2");
  });

  it("GET /api/user/recent returns recently opened resources", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/user/recent",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(5);
    expect(data[0].title).toBe("Recent 1");
    expect(data[1].title).toBe("Recent 2");
  });
});
