import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ResourceModel } from "../src/models/Resource.js";
import { createTestApp, teardownTestApp, TestAppContext } from "./helpers.js";

let ctx: TestAppContext;

describe("DeletionPlugin", () => {
  beforeAll(async () => {
    ctx = await createTestApp();

    await ProjectModel.createCollection();
    await ProjectModel.init();
    await KnowledgeListModel.createCollection();
    await KnowledgeListModel.init();
    await ResourceModel.createCollection();
    await ResourceModel.init();
  }, 60000);

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("should cascade delete a project, its lists, and resources from DB and Storage", async () => {
    const ownerId = "test-user-1";

    await tenantContext.run({ ownerId }, async () => {
      const project = await ProjectModel.create({
        ownerId,
        name: "Test Project",
        slug: "test-project",
      });

      const list = await KnowledgeListModel.create({
        ownerId,
        projectId: project._id,
        name: "Test List",
        slug: "test-list",
        position: 0,
      });

      const resource1 = await ResourceModel.create({
        ownerId,
        projectId: project._id,
        listId: list._id,
        title: "Doc 1",
        type: "pdf",
        driveFileId: "file-1",
      });

      const resource2 = await ResourceModel.create({
        ownerId,
        projectId: project._id,
        listId: list._id,
        title: "Doc 2",
        type: "image",
        driveFileId: "file-2",
      });

      const resourceNoFile = await ResourceModel.create({
        ownerId,
        projectId: project._id,
        listId: list._id,
        title: "Link 1",
        type: "url",
        url: "https://example.com",
      });

      // Execute deletion
      await ctx.app.deleter.deleteProject(project._id.toString(), ownerId);

      // Verify DB
      expect(await ProjectModel.countDocuments({ _id: project._id })).toBe(0);
      expect(
        await KnowledgeListModel.countDocuments({ projectId: project._id }),
      ).toBe(0);
      expect(
        await ResourceModel.countDocuments({ projectId: project._id }),
      ).toBe(0);

      // Verify Storage
      expect(ctx.fakeStorage.deletedFiles.has("file-1")).toBe(true);
      expect(ctx.fakeStorage.deletedFiles.has("file-2")).toBe(true);
    });
  });
});
