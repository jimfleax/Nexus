import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

describe("Resources Routes (CRUD)", () => {
  let ctx: TestAppContext;
  let resourceId: string;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [resourceRoutes] });

    // Create a dummy resource
    const res = await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Test Note",
        type: "note",
        content: "Hello world",
        ownerId: "test-user-1",
      });
    });
    resourceId = res.id;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("GET /api/resources/:id should return a resource", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/resources/${resourceId}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.title).toBe("Test Note");
    expect(data.type).toBe("note");
  });

  it("PATCH /api/resources/:id should update resource details", async () => {
    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/resources/${resourceId}`,
      payload: {
        title: "Updated Note",
        isFavorite: true,
      },
    });

    if (response.statusCode === 500) console.error(response.payload);
    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.title).toBe("Updated Note");
    expect(data.isFavorite).toBe(true);
  });

  it("PATCH /api/resources/:id should update resource listId", async () => {
    // Create a dummy list first
    const list2 = await inTenant("test-user-1", async () => {
      return await mongoose.model("KnowledgeList").create({
        projectId: "p1",
        name: "List 2",
        slug: "list-2",
        ownerId: "test-user-1",
        position: 1,
      });
    });

    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/resources/${resourceId}`,
      payload: {
        listId: list2.id,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.listId).toBe(list2.id);
  });

  it(
    "DELETE /api/resources/:id should delete the resource",
    { retry: 2 },
    async () => {
      const response = await ctx.app.inject({
        method: "DELETE",
        url: `/api/resources/${resourceId}`,
      });

      expect(response.statusCode).toBe(204);

      const check = await ResourceModel.findById(resourceId, null, {
        skipTenant: true,
      });
      expect(check).toBeNull();
    },
  );

  it("PATCH /api/resources/:id should prevent moving to a project where title already exists", async () => {
    // Create project 2 and a list in it
    const list3 = await inTenant("test-user-1", async () => {
      return await mongoose.model("KnowledgeList").create({
        projectId: "p2",
        name: "List 3",
        slug: "list-3",
        ownerId: "test-user-1",
        position: 1,
      });
    });

    // Create a resource in p2 with a specific title
    await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p2",
        listId: list3.id,
        title: "Conflict Title",
        type: "note",
        content: "Existing resource",
        ownerId: "test-user-1",
      });
    });

    // Create another resource in p1
    const resToMove = await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Conflict Title",
        type: "note",
        content: "To be moved",
        ownerId: "test-user-1",
      });
    });

    // Attempt to move it to p2
    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/resources/${resToMove.id}`,
      payload: {
        listId: list3.id,
      },
    });

    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.payload);
    expect(data.error).toMatch(/already exists in the project/);
  });

  it("PUT /api/resources/:id/favorite should handle concurrent toggles correctly", async () => {
    const res = await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Concurrent Favorite Test",
        type: "note",
        content: "Testing toggles",
        ownerId: "test-user-1",
        isFavorite: false,
      });
    });

    // Fire two toggle requests simultaneously
    const req1 = ctx.app.inject({
      method: "PUT",
      url: `/api/resources/${res.id}/favorite`,
    });
    const req2 = ctx.app.inject({
      method: "PUT",
      url: `/api/resources/${res.id}/favorite`,
    });

    await Promise.all([req1, req2]);

    // Read final state
    const finalState = await inTenant("test-user-1", async () => {
      return await ResourceModel.findById(res.id);
    });

    // Started false. Two toggles should mean false -> true -> false.
    expect(finalState?.isFavorite).toBe(false);
  });
});
