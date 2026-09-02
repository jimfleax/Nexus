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

  describe("deleteList", () => {
    it("cascades deletion of resources and Drive files, leaving project and other lists intact", async () => {
      const ownerId = "test-user-1";
      await tenantContext.run({ ownerId }, async () => {
        // Setup
        const project = await ProjectModel.create({ name: "P1", slug: "p1" });
        const list1 = await KnowledgeListModel.create({
          projectId: project._id,
          name: "L1",
          slug: "l1",
          position: 0,
        });
        const list2 = await KnowledgeListModel.create({
          projectId: project._id,
          name: "L2",
          slug: "l2",
          position: 1,
        });

        await ResourceModel.create({
          projectId: project._id,
          listId: list1._id,
          title: "R1",
          type: "pdf",
          driveFileId: "l1-file-1",
        });
        await ResourceModel.create({
          projectId: project._id,
          listId: list1._id,
          title: "R2",
          type: "pdf",
          driveFileId: "l1-file-2",
        });
        await ResourceModel.create({
          projectId: project._id,
          listId: list1._id,
          title: "R3",
          type: "url",
          url: "https://example.com",
        }); // No drive file
        await ResourceModel.create({
          projectId: project._id,
          listId: list2._id,
          title: "R4",
          type: "pdf",
          driveFileId: "l2-file-1",
        });

        // Action
        await ctx.app.deleter.deleteList(list1._id.toString(), ownerId);

        // Assert List 1 and its resources are gone
        expect(
          await KnowledgeListModel.countDocuments({ _id: list1._id }),
        ).toBe(0);
        expect(await ResourceModel.countDocuments({ listId: list1._id })).toBe(
          0,
        );
        expect(ctx.fakeStorage.deletedFiles.has("l1-file-1")).toBe(true);
        expect(ctx.fakeStorage.deletedFiles.has("l1-file-2")).toBe(true);

        // Assert List 2 and Project remain intact
        expect(
          await KnowledgeListModel.countDocuments({ _id: list2._id }),
        ).toBe(1);
        expect(await ResourceModel.countDocuments({ listId: list2._id })).toBe(
          1,
        );
        expect(ctx.fakeStorage.deletedFiles.has("l2-file-1")).toBe(false);
        expect(await ProjectModel.countDocuments({ _id: project._id })).toBe(1);
      });
    });

    it("handles list with no drive-file resources successfully", async () => {
      const ownerId = "test-user-1";
      await tenantContext.run({ ownerId }, async () => {
        const project = await ProjectModel.create({ name: "P2", slug: "p2" });
        const list = await KnowledgeListModel.create({
          projectId: project._id,
          name: "L NoDrive",
          slug: "l-nodrive",
          position: 0,
        });
        await ResourceModel.create({
          projectId: project._id,
          listId: list._id,
          title: "R URL",
          type: "url",
          url: "https://example.com",
        });

        const initialDeletedCount = ctx.fakeStorage.deletedFiles.size;
        await ctx.app.deleter.deleteList(list._id.toString(), ownerId);

        expect(await KnowledgeListModel.countDocuments({ _id: list._id })).toBe(
          0,
        );
        expect(await ResourceModel.countDocuments({ listId: list._id })).toBe(
          0,
        );
        expect(ctx.fakeStorage.deletedFiles.size).toBe(initialDeletedCount); // No drive deletes called
      });
    });
  });

  describe("deleteResource", () => {
    it("deletes single resource and its Drive file", async () => {
      const ownerId = "test-user-1";
      await tenantContext.run({ ownerId }, async () => {
        const project = await ProjectModel.create({ name: "P3", slug: "p3" });
        const list = await KnowledgeListModel.create({
          projectId: project._id,
          name: "L3",
          slug: "l3",
          position: 0,
        });
        const resWithDrive = await ResourceModel.create({
          projectId: project._id,
          listId: list._id,
          title: "Res Drive",
          type: "pdf",
          driveFileId: "r-file-1",
        });
        const resNoDrive = await ResourceModel.create({
          projectId: project._id,
          listId: list._id,
          title: "Res URL",
          type: "url",
          url: "https://test.com",
        });

        // Delete drive resource
        await ctx.app.deleter.deleteResource(
          resWithDrive._id.toString(),
          ownerId,
        );
        expect(
          await ResourceModel.countDocuments({ _id: resWithDrive._id }),
        ).toBe(0);
        expect(ctx.fakeStorage.deletedFiles.has("r-file-1")).toBe(true);

        // Delete non-drive resource
        const beforeSize = ctx.fakeStorage.deletedFiles.size;
        await ctx.app.deleter.deleteResource(
          resNoDrive._id.toString(),
          ownerId,
        );
        expect(
          await ResourceModel.countDocuments({ _id: resNoDrive._id }),
        ).toBe(0);
        expect(ctx.fakeStorage.deletedFiles.size).toBe(beforeSize); // Unchanged
      });
    });

    it("is a no-op when resource does not exist", async () => {
      const ownerId = "test-user-1";
      await tenantContext.run({ ownerId }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        await expect(
          ctx.app.deleter.deleteResource(fakeId, ownerId),
        ).resolves.not.toThrow();
      });
    });

    it("isolates tenant correctly (no-op on another tenant's resource)", async () => {
      let u2ResourceId: string;
      await tenantContext.run({ ownerId: "user-2" }, async () => {
        const project = await ProjectModel.create({ name: "P4", slug: "p4" });
        const list = await KnowledgeListModel.create({
          projectId: project._id,
          name: "L4",
          slug: "l4",
          position: 0,
        });
        const res = await ResourceModel.create({
          projectId: project._id,
          listId: list._id,
          title: "Res U2",
          type: "pdf",
          driveFileId: "u2-file",
        });
        u2ResourceId = res._id.toString();
      });

      // Try to delete U2's resource as test-user-1
      await tenantContext.run({ ownerId: "test-user-1" }, async () => {
        await ctx.app.deleter.deleteResource(u2ResourceId, "test-user-1");
      });

      // Verify U2's resource still exists and file not deleted
      await tenantContext.run({ ownerId: "user-2" }, async () => {
        expect(await ResourceModel.countDocuments({ _id: u2ResourceId })).toBe(
          1,
        );
      });
      expect(ctx.fakeStorage.deletedFiles.has("u2-file")).toBe(false);
    });
  });
});
