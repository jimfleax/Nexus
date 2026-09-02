/**
 * @file resources-list.test.ts
 * @description Tests for the resource listing endpoint (GET /api/projects/:projectId/resources).
 * @architecture Uses createTestApp helper with resource routes registered.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

describe("GET /api/projects/:projectId/resources", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [resourceRoutes] });

    await inTenant("test-user-1", async () => {
      await ResourceModel.create([
        {
          projectId: "proj-list-test",
          listId: "list-a",
          title: "Resource A1",
          type: "note",
          content: "Content A1",
        },
        {
          projectId: "proj-list-test",
          listId: "list-a",
          title: "Resource A2",
          type: "pdf",
          content: "Content A2",
        },
        {
          projectId: "proj-list-test",
          listId: "list-b",
          title: "Resource B1",
          type: "url",
          content: "Content B1",
        },
        {
          projectId: "other-proj",
          listId: "list-x",
          title: "Other Resource",
          type: "note",
        },
      ]);
    });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("should return all resources for a project", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/projects/proj-list-test/resources",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveLength(3);

    // Content should be excluded
    data.forEach((r: any) => expect(r.content).toBeUndefined());
  });

  it("should filter by listId when provided", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/projects/proj-list-test/resources?listId=list-a",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveLength(2);
    data.forEach((r: any) => expect(r.listId).toBe("list-a"));
  });

  it("should return empty array for project with no resources", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/projects/empty-proj/resources",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveLength(0);
  });

  it("should not return resources from other projects", async () => {
    const response = await ctx.app.inject({
      method: "GET",
      url: "/api/projects/proj-list-test/resources",
    });

    const data = JSON.parse(response.payload);
    const titles = data.map((r: any) => r.title);
    expect(titles).not.toContain("Other Resource");
  });
});
