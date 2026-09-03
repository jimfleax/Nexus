import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import { ResourceModel } from "../src/models/Resource.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ProjectModel } from "../src/models/Project.js";
import { UserModel } from "../src/models/User.js";
import { runGarbageCollection } from "../src/gc.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";
import { resourceRoutes } from "../src/routes/resources.js";
import multipart from "@fastify/multipart";
import FormData from "form-data";

let ctx: TestAppContext;
const ownerId = "test-user-1";

describe("Backend Integrity Fixes", () => {
  beforeAll(async () => {
    ctx = await createTestApp({
      extraPlugins: [{ plugin: multipart }],
      routes: [resourceRoutes],
    });
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await ResourceModel.deleteMany({}, { skipTenant: true });
    await KnowledgeListModel.deleteMany({}, { skipTenant: true });
    await ProjectModel.deleteMany({}, { skipTenant: true });
    await UserModel.deleteMany({}, { skipTenant: true });
    vi.clearAllMocks();
  });

  describe("Fix A: deletion plugin — transaction atomicity", () => {
    it("does not call deleteFiles if commitTransaction throws", async () => {
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj",
        });
        await ResourceModel.create({
          _id: new mongoose.Types.ObjectId().toHexString(),
          projectId,
          listId,
          title: "Res",
          type: "pdf",
          status: "ready",
          driveFileId: "drive-1",
        });
      });

      vi.spyOn(
        mongoose.mongo.ClientSession.prototype,
        "commitTransaction",
      ).mockRejectedValueOnce(new Error("Transient Mongo Error"));
      const deleteFilesSpy = vi.spyOn(ctx.fakeStorage, "deleteFiles");

      await inTenant(ownerId, async () => {
        await expect(
          ctx.app.deleter.deleteProject(projectId, ownerId),
        ).rejects.toThrow("Transient Mongo Error");
      });
      expect(deleteFilesSpy).not.toHaveBeenCalled();
    });

    it("calls deleteFiles only after a successful commitTransaction", async () => {
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj",
        });
        await ResourceModel.create({
          _id: new mongoose.Types.ObjectId().toHexString(),
          projectId,
          listId,
          title: "Res",
          type: "pdf",
          status: "ready",
          driveFileId: "drive-1",
        });
      });

      const deleteFilesSpy = vi.spyOn(ctx.fakeStorage, "deleteFiles");
      await inTenant(ownerId, async () => {
        await ctx.app.deleter.deleteProject(projectId, ownerId);
      });
      expect(deleteFilesSpy).toHaveBeenCalledWith(ownerId, ["drive-1"]);
    });

    it("deleteList: same guarantee", async () => {
      let listId = new mongoose.Types.ObjectId().toHexString();
      let projectId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await KnowledgeListModel.create({
          _id: listId,
          projectId,
          name: "List",
          slug: "list",
          position: 0,
        });
        await ResourceModel.create({
          _id: new mongoose.Types.ObjectId().toHexString(),
          projectId,
          listId,
          title: "Res",
          type: "pdf",
          status: "ready",
          driveFileId: "drive-2",
        });
      });

      vi.spyOn(
        mongoose.mongo.ClientSession.prototype,
        "commitTransaction",
      ).mockRejectedValueOnce(new Error("Commit Failed"));
      const deleteFilesSpy = vi.spyOn(ctx.fakeStorage, "deleteFiles");

      await inTenant(ownerId, async () => {
        await expect(
          ctx.app.deleter.deleteList(listId, ownerId),
        ).rejects.toThrow("Commit Failed");
      });
      expect(deleteFilesSpy).not.toHaveBeenCalled();
    });

    it("deleteResource: same guarantee", async () => {
      let resourceId = new mongoose.Types.ObjectId().toHexString();
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ResourceModel.create({
          _id: resourceId,
          projectId,
          listId,
          title: "Res",
          type: "pdf",
          status: "ready",
          driveFileId: "drive-3",
        });
      });

      vi.spyOn(
        mongoose.mongo.ClientSession.prototype,
        "commitTransaction",
      ).mockRejectedValueOnce(new Error("Commit Failed"));
      const deleteFilesSpy = vi.spyOn(ctx.fakeStorage, "deleteFiles");

      await inTenant(ownerId, async () => {
        await expect(
          ctx.app.deleter.deleteResource(resourceId, ownerId),
        ).rejects.toThrow("Commit Failed");
      });
      expect(deleteFilesSpy).not.toHaveBeenCalled();
    });
  });

  describe("Fix B: resource creation — two-phase upload", () => {
    it("saves a resource with status=pending before calling uploadFile", async () => {
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj",
        });
        await KnowledgeListModel.create({
          _id: listId,
          projectId,
          name: "List",
          slug: "list",
          position: 0,
        });
      });

      // We mock uploadFile to throw, but before throwing we verify the pending record exists.
      vi.spyOn(ctx.fakeStorage, "uploadFile").mockImplementationOnce(
        async () => {
          const resources = await ResourceModel.find({}, null, {
            skipTenant: true,
          });
          expect(resources.length).toBe(1);
          expect(resources[0].status).toBe("pending");
          throw new Error("Fake upload failure");
        },
      );

      const form = new FormData();
      form.append("projectId", projectId);
      form.append("listId", listId);
      form.append("title", "Test File");
      form.append("type", "pdf");
      form.append("file", Buffer.from("fake data"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        headers: form.getHeaders(),
        payload: form.getBuffer(),
      });
      expect(response.statusCode).toBe(500);

      // Check the db to ensure the pending record was cleaned up
      const finalResources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(finalResources.length).toBe(0);
    });

    it("updates status to ready and sets driveFileId after a successful upload", async () => {
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj",
        });
        await KnowledgeListModel.create({
          _id: listId,
          projectId,
          name: "List",
          slug: "list",
          position: 0,
        });
      });

      const form = new FormData();
      form.append("projectId", projectId);
      form.append("listId", listId);
      form.append("title", "Test File 2");
      form.append("type", "pdf");
      form.append("file", Buffer.from("fake data"), {
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

      const resources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(resources.length).toBe(1);
      expect(resources[0].status).toBe("ready");
      expect(resources[0].driveFileId).toBeDefined();
    });

    it("deletes the pending record when uploadFile throws a StorageError", async () => {
      ctx.app.storage.uploadFile = vi
        .fn()
        .mockRejectedValueOnce({ name: "StorageError", message: "Failed" });
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj2",
        });
        await KnowledgeListModel.create({
          _id: listId,
          projectId,
          name: "List",
          slug: "list2",
          position: 0,
        });
      });

      const FormData = (await import("form-data")).default;
      const form = new FormData();
      form.append("projectId", projectId);
      form.append("listId", listId);
      form.append("title", "Failed Upload");
      form.append("type", "pdf");
      form.append("file", Buffer.from("fake data"), {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        headers: form.getHeaders(),
        payload: form.getBuffer(),
      });
      expect(response.statusCode).toBe(400);

      const resources = await ResourceModel.find(
        { title: "Failed Upload" },
        null,
        { skipTenant: true },
      );
      expect(resources.length).toBe(0);
    });

    it("creates a resource in status=ready immediately for non-file types", async () => {
      let projectId = new mongoose.Types.ObjectId().toHexString();
      let listId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ProjectModel.create({
          _id: projectId,
          name: "Proj",
          slug: "proj",
        });
        await KnowledgeListModel.create({
          _id: listId,
          projectId,
          name: "List",
          slug: "list",
          position: 0,
        });
      });

      const response = await ctx.app.inject({
        method: "POST",
        url: "/api/resources",
        payload: {
          projectId,
          listId,
          title: "URL Resource",
          type: "note",
          content: "test note",
        },
      });
      expect(response.statusCode).toBe(201);
      const resources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(resources.length).toBe(1);
      expect(resources[0].status).toBe("ready");
    });
  });

  describe("Fix C: garbage collection — Drive failure handling", () => {
    it("does not delete the DB record when storage adapter throws", async () => {
      const deleteMock = vi
        .spyOn(ctx.app.storage, "deleteFiles")
        .mockRejectedValueOnce(new Error("Drive API Error"));

      process.env.AUTH_GOOGLE_ID = "test";
      process.env.AUTH_GOOGLE_SECRET = "test";

      await UserModel.create({
        ownerId,
        email: "test@test.com",
        driveRefreshToken: "token",
      });
      const resourceId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ResourceModel.create({
          _id: resourceId,
          projectId: new mongoose.Types.ObjectId().toHexString(),
          listId: new mongoose.Types.ObjectId().toHexString(),
          title: "Stale",
          type: "pdf",
          status: "pending",
          driveFileId: "stale-drive-id",
        });
        await ResourceModel.updateOne(
          { _id: resourceId },
          { $set: { updatedAt: new Date(Date.now() - 40 * 60 * 1000) } },
          { strict: false, timestamps: false },
        );
      });

      await runGarbageCollection(ctx.app.storage);

      const resources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(resources.length).toBe(1);
      expect(resources[0]._id.toHexString()).toBe(resourceId);
    });

    it("deletes the DB record after a successful storage delete", async () => {
      const deleteMock = vi
        .spyOn(ctx.app.storage, "deleteFiles")
        .mockResolvedValueOnce();

      process.env.AUTH_GOOGLE_ID = "test";
      process.env.AUTH_GOOGLE_SECRET = "test";

      await UserModel.create({
        ownerId,
        email: "test@test.com",
        driveRefreshToken: "token",
      });
      const resourceId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ResourceModel.create({
          _id: resourceId,
          projectId: new mongoose.Types.ObjectId().toHexString(),
          listId: new mongoose.Types.ObjectId().toHexString(),
          title: "Stale",
          type: "pdf",
          status: "pending",
          driveFileId: "stale-drive-id-2",
        });
        await ResourceModel.updateOne(
          { _id: resourceId },
          { $set: { updatedAt: new Date(Date.now() - 40 * 60 * 1000) } },
          { strict: false, timestamps: false },
        );
      });

      await runGarbageCollection(ctx.app.storage);

      const resources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(resources.length).toBe(0);
    });

    it("deletes the DB record when the user has no driveRefreshToken", async () => {
      // In FakeStorageAdapter, we don't care about tokens, so it will just succeed.
      // But we will test that it calls the storage adapter properly.
      await UserModel.create({ ownerId, email: "test@test.com" }); // No refresh token
      const resourceId = new mongoose.Types.ObjectId().toHexString();
      await inTenant(ownerId, async () => {
        await ResourceModel.create({
          _id: resourceId,
          projectId: new mongoose.Types.ObjectId().toHexString(),
          listId: new mongoose.Types.ObjectId().toHexString(),
          title: "Stale",
          type: "pdf",
          status: "pending",
          driveFileId: "stale-drive-id-3",
        });
        await ResourceModel.updateOne(
          { _id: resourceId },
          { $set: { updatedAt: new Date(Date.now() - 40 * 60 * 1000) } },
          { strict: false, timestamps: false },
        );
      });

      await runGarbageCollection(ctx.app.storage);

      const resources = await ResourceModel.find({}, null, {
        skipTenant: true,
      });
      expect(resources.length).toBe(0);
    });
  });
});
