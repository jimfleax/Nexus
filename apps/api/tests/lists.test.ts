import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { listRoutes } from "../src/routes/lists.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ProjectModel } from "../src/models/Project.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

describe("Lists Routes", () => {
  let ctx: TestAppContext;
  let projectId: string;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [listRoutes] });

    // Create a dummy project
    const project = await inTenant("test-user-1", async () => {
      return await ProjectModel.create({
        name: "Test Project",
        slug: "test-project",
        ownerId: "test-user-1",
      });
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("POST /api/projects/:projectId/lists should create a new list", async () => {
    const response = await ctx.app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/lists`,
      payload: {
        name: "My List",
        description: "Test list",
      },
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("My List");
    expect(data.slug).toBe("my-list");
    expect(data.position).toBeDefined();
  });

  it("GET /api/lists should list all lists for a project", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/lists`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toBe("My List");
  });

  it("PATCH /api/lists/:id should update a list", async () => {
    const lists = await KnowledgeListModel.find({}, null, { skipTenant: true });
    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/lists/${lists[0].id}`,
      payload: {
        name: "Updated List",
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Updated List");
    expect(data.slug).toBe("updated-list");
  });

  it("DELETE /api/lists/:id should delete a list", { retry: 2 }, async () => {
    const lists = await KnowledgeListModel.find({}, null, { skipTenant: true });
    const response = await ctx.app.inject({
      method: "DELETE",
      url: `/api/lists/${lists[0].id}`,
    });

    expect(response.statusCode).toBe(204);

    const check = await KnowledgeListModel.findById(lists[0].id, null, {
      skipTenant: true,
    });
    expect(check).toBeNull();
  });
});
