import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import multipart from "@fastify/multipart";
import FormData from "form-data";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

let ctx: TestAppContext;
let fakeListId: string;
let fakeProjectId: string;

describe("Resources Multipart Upload", () => {
  beforeAll(async () => {
    fakeListId = new mongoose.Types.ObjectId().toHexString();
    fakeProjectId = new mongoose.Types.ObjectId().toHexString();

    ctx = await createTestApp({
      extraPlugins: [{ plugin: multipart }],
      routes: [resourceRoutes],
    });

    await inTenant("test-user-1", async () => {
      await KnowledgeListModel.create({
        _id: fakeListId,
        projectId: fakeProjectId,
        name: "Test List",
        slug: "test-list",
        position: 0,
      });
    });
  }, 60000);

  afterAll(async () => {
    await teardownTestApp(ctx);
  }, 60000);

  it("POST /api/resources accepts multipart and streams to storage", async () => {
    const form = new FormData();
    form.append("projectId", fakeProjectId);
    form.append("listId", fakeListId);
    form.append("title", "Test Upload");
    form.append("type", "pdf");
    form.append("file", Buffer.from("fake pdf content"), {
      filename: "test.pdf",
      contentType: "application/pdf",
    });

    const response = await ctx.app.inject({
      method: "POST",
      url: "/api/resources",
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.payload);

    expect(data.title).toBe("Test Upload");
    expect(data.driveFileId).toMatch(/^fake-file-/);
    expect(data.size).toBe(Buffer.from("fake pdf content").length);
    expect(data.status).toBe("ready");

    // Verify it was stored in the fake adapter
    const uploadMeta = ctx.fakeStorage.uploads.get(data.driveFileId);
    expect(uploadMeta).toBeDefined();
    expect(uploadMeta?.title).toBe("Test Upload");
    expect(uploadMeta?.mimeType).toBe("application/pdf");
  }, 60000);
});
