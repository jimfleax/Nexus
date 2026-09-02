import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { projectRoutes } from "../src/routes/projects.js";
import { ProjectModel } from "../src/models/Project.js";
import { createTestApp, teardownTestApp, TestAppContext } from "./helpers.js";

describe("Project Routes", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [projectRoutes] });
    await ProjectModel.init();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("POST /api/projects should create a new project", async () => {
    const response = await ctx.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        name: "Test Project",
        description: "A test project",
        color: "#ffffff",
      },
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Test Project");
    expect(data.slug).toBe("test-project");
  });

  it("POST /api/projects should return 409 for duplicate project name", async () => {
    const response = await ctx.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        name: "Test Project",
        description: "Another one",
        color: "#000000",
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("GET /api/projects should list all projects", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/projects",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toBe("Test Project");
  });

  it("GET /api/projects/:id should return project details", async () => {
    const projects = await ProjectModel.find({}, null, { skipTenant: true });
    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/projects/${projects[0].id}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Test Project");
  });

  it("PATCH /api/projects/:id should update a project", async () => {
    const projects = await ProjectModel.find({}, null, { skipTenant: true });
    const response = await ctx.app.inject({
      method: "PATCH",
      url: `/api/projects/${projects[0].id}`,
      payload: {
        name: "Updated Project",
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Updated Project");
    expect(data.slug).toBe("updated-project");
  });

  it(
    "DELETE /api/projects/:id should delete a project",
    { retry: 2 },
    async () => {
      const projects = await ProjectModel.find({}, null, { skipTenant: true });
      const response = await ctx.app.inject({
        method: "DELETE",
        url: `/api/projects/${projects[0].id}`,
      });

      expect(response.statusCode).toBe(204);

      const check = await ProjectModel.findById(projects[0].id, null, {
        skipTenant: true,
      });
      expect(check).toBeNull();
    },
  );
});
