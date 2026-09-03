import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
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
  let list2Id: string;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [resourceRoutes] });

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
    list2Id = list2.id;

    const res = await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Test Note",
        type: "note",
        ownerId: "test-user-1",
      });
    });
    resourceId = res.id;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("PATCH /api/resources/:id listId", async () => {
    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/resources/${resourceId}`,
      payload: { listId: list2Id },
    });
    console.log("RESPONSE:", response.payload);
  });
});
