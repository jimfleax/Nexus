/**
 * @file error-paths.test.ts
 * @description Tests for error paths: duplicate titles, missing entities, invalid payloads.
 * @architecture Uses createTestApp with all required plugins and route modules.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import multipart from "@fastify/multipart";
import { projectRoutes } from "../src/routes/projects.js";
import { listRoutes } from "../src/routes/lists.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { createTestApp, teardownTestApp, TestAppContext } from "./helpers.js";

describe("Error Paths", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({
      extraPlugins: [{ plugin: multipart }],
      routes: [projectRoutes, listRoutes, resourceRoutes],
    });
    // Ensure indexes exist for unique constraint tests
    await ProjectModel.createCollection();
    await ProjectModel.init();
    await KnowledgeListModel.createCollection();
    await KnowledgeListModel.init();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  describe("Project errors", () => {
    it("GET /api/projects/:id returns 404 for nonexistent project", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "GET",
        url: `/api/projects/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload).error).toBe("Project not found");
    });

    it("PATCH /api/projects/:id returns 404 for nonexistent project", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "PATCH",
        url: `/api/projects/${fakeId}`,
        payload: { name: "Updated" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("DELETE /api/projects/:id returns 404 for nonexistent project", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "DELETE",
        url: `/api/projects/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("POST /api/projects returns 400 for empty name", async () => {
      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { name: "" },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("List errors", () => {
    let projectId: string;

    beforeAll(async () => {
      const res = await ctx.app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { name: "List Error Project" },
      });
      projectId = JSON.parse(res.payload).id;
    });

    it("POST /api/projects/:projectId/lists returns 404 for nonexistent project", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "POST",
        url: `/api/projects/${fakeId}/lists`,
        payload: { name: "Orphan List" },
      });
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload).error).toBe("Project not found");
    });

    it("GET /api/lists/:id returns 404 for nonexistent list", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "GET",
        url: `/api/lists/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("PATCH /api/lists/:id returns 404 for nonexistent list", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "PATCH",
        url: `/api/lists/${fakeId}`,
        payload: { name: "Updated" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("DELETE /api/lists/:id returns 404 for nonexistent list", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "DELETE",
        url: `/api/lists/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("POST /api/projects/:projectId/lists returns 409 for duplicate name", async () => {
      await ctx.app.inject({
        method: "POST",
        url: `/api/projects/${projectId}/lists`,
        payload: { name: "Unique List" },
      });

      const response = await ctx.app.inject({
        method: "POST",
        url: `/api/projects/${projectId}/lists`,
        payload: { name: "Unique List" },
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe("Resource errors", () => {
    let projectId: string;
    let listId: string;

    beforeAll(async () => {
      const projRes = await ctx.app.inject({
        method: "POST",
        url: "/api/projects",
        payload: { name: "Resource Error Project" },
      });
      projectId = JSON.parse(projRes.payload).id;

      const listRes = await ctx.app.inject({
        method: "POST",
        url: `/api/projects/${projectId}/lists`,
        payload: { name: "Resource Error List" },
      });
      listId = JSON.parse(listRes.payload).id;
    });

    it("GET /api/resources/:id returns 404 for nonexistent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "GET",
        url: `/api/resources/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("PATCH /api/resources/:id returns 404 for nonexistent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "PATCH",
        url: `/api/resources/${fakeId}`,
        payload: { title: "Updated" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("DELETE /api/resources/:id returns 404 for nonexistent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "DELETE",
        url: `/api/resources/${fakeId}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("POST /api/resources returns 404 when list does not exist in project", async () => {
      const fakeListId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        payload: {
          projectId,
          listId: fakeListId,
          title: "Bad List Resource",
          type: "note",
        },
      });
      expect(response.statusCode).toBe(404);
    });

    it("POST /api/resources returns 400 for duplicate title in same project", async () => {
      await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        payload: {
          projectId,
          listId,
          title: "Unique Resource",
          type: "note",
        },
      });

      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        payload: {
          projectId,
          listId,
          title: "Unique Resource",
          type: "note",
        },
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toContain("already exists");
    });

    it("POST /api/resources returns 400 for invalid payload", async () => {
      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        payload: {
          projectId,
          listId,
          // missing title
          type: "note",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("PUT /api/resources/:id/favorite returns 404 for nonexistent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "PUT",
        url: `/api/resources/${fakeId}/favorite`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("POST /api/resources/:id/open returns 404 for nonexistent resource", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const response = await ctx.app.inject({
        method: "POST",
        url: `/api/resources/${fakeId}/open`,
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
