/**
 * @file resource.service.test.ts
 * @description Unit tests for the resource service business logic.
 * @architecture Tests the service functions directly with in-memory MongoDB, no HTTP layer involved.
 */

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
import { tenantContext, connectDB } from "../src/db.js";
import { ResourceModel } from "../src/models/Resource.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import {
  listResourcesByProject,
  findResourceById,
  isDuplicateTitle,
  validateListMembership,
  createResource,
  updateResource,
  queryResources,
  createResourceWithUpload,
} from "../src/services/resource.service.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const OWNER = "res-svc-test-user";
let projectId: string;
let listId: string;

describe("ResourceService", () => {
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());

    await tenantContext.run({ ownerId: OWNER }, async () => {
      const list = await KnowledgeListModel.create({
        ownerId: OWNER,
        projectId: "proj-res-test",
        name: "Test List",
        slug: "test-list",
        position: 0,
      });
      projectId = "proj-res-test";
      listId = list._id.toString();
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("createResource", () => {
    it("should create a resource with defaults", async () => {
      const resource = await tenantContext.run({ ownerId: OWNER }, async () => {
        return createResource({
          projectId,
          listId,
          title: "Test Resource",
          type: "note",
        });
      });

      expect(resource.title).toBe("Test Resource");
      expect(resource.type).toBe("note");
      expect(resource.status).toBe("ready");
    });
  });

  describe("findResourceById", () => {
    it("should find a resource by ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await ResourceModel.find({}, null, { skipTenant: true });
        const found = await findResourceById(all[0]._id.toString());
        expect(found).not.toBeNull();
        expect(found!.title).toBe("Test Resource");
      });
    });

    it("should return null for nonexistent ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const found = await findResourceById(fakeId);
        expect(found).toBeNull();
      });
    });
  });

  describe("isDuplicateTitle", () => {
    it("should return true when duplicate exists", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const exists = await isDuplicateTitle(
          projectId,
          "Test Resource",
          OWNER,
        );
        expect(exists).toBe(true);
      });
    });

    it("should return false when no duplicate exists", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const exists = await isDuplicateTitle(
          projectId,
          "Nonexistent Title",
          OWNER,
        );
        expect(exists).toBe(false);
      });
    });

    it("should exclude a specific resource ID (for updates)", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await ResourceModel.find({}, null, { skipTenant: true });
        const exists = await isDuplicateTitle(
          projectId,
          "Test Resource",
          OWNER,
          all[0]._id.toString(),
        );
        expect(exists).toBe(false); // excluded the only match
      });
    });
  });

  describe("validateListMembership", () => {
    it("should return the list when it belongs to the project", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const list = await validateListMembership(listId, projectId);
        expect(list).not.toBeNull();
        expect(list!.name).toBe("Test List");
      });
    });

    it("should return null when list does not belong to project", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const list = await validateListMembership(listId, "wrong-project");
        expect(list).toBeNull();
      });
    });
  });

  describe("listResourcesByProject", () => {
    it("should list resources for a project", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resources = await listResourcesByProject(projectId);
        expect(resources.length).toBeGreaterThan(0);
        // content should be excluded
        expect((resources[0] as any).content).toBeUndefined();
      });
    });

    it("should filter by listId when provided", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resources = await listResourcesByProject(projectId, listId);
        expect(resources.length).toBeGreaterThan(0);
        resources.forEach((r: any) => expect(r.listId).toBe(listId));
      });
    });
  });

  describe("updateResource", () => {
    it("should update fields on a resource", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await ResourceModel.find({}, null, { skipTenant: true });
        const updated = await updateResource(all[0]._id.toString(), {
          title: "Updated Resource",
          isFavorite: true,
        });
        expect(updated).not.toBeNull();
        expect(updated!.title).toBe("Updated Resource");
        expect(updated!.isFavorite).toBe(true);
      });
    });

    it("should return null for nonexistent resource", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const result = await updateResource(fakeId, { title: "Nope" });
        expect(result).toBeNull();
      });
    });
  });

  describe("queryResources", () => {
    it("should filter, sort, and omit content by default", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resources = await queryResources(
          { projectId },
          { sort: { createdAt: -1 } },
        );
        expect(resources.length).toBeGreaterThan(0);
        expect((resources[0] as any).content).toBeUndefined();
      });
    });

    it("should allow overriding select and limit", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resources = await queryResources(
          { projectId },
          { select: "title type", limit: 1 },
        );
        expect(resources).toHaveLength(1);
        expect((resources[0] as any).type).toBeDefined();
        expect((resources[0] as any).createdAt).toBeUndefined();
      });
    });
  });

  describe("createResourceWithUpload", () => {
    const fakeStorage = {
      uploadFile: vi.fn(),
      deleteFiles: vi.fn(),
      getFileStream: vi.fn(),
      getQuota: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should create a non-file resource without calling storage", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resource = await createResourceWithUpload(
          OWNER,
          {
            projectId,
            listId,
            title: "URL Resource",
            type: "url",
            url: "https://example.com",
          },
          fakeStorage as any,
        );
        expect(resource.title).toBe("URL Resource");
        expect(resource.status).toBe("ready");
        expect(fakeStorage.uploadFile).not.toHaveBeenCalled();
      });
    });

    it("should throw if file stream is missing for file upload", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          createResourceWithUpload(
            OWNER,
            { projectId, listId, title: "Missing Stream PDF", type: "pdf" },
            fakeStorage as any,
          ),
        ).rejects.toThrow("File stream required");
      });
    });

    it("should orchestrate file upload and update status to ready", async () => {
      fakeStorage.uploadFile.mockResolvedValueOnce({
        driveFileId: "drive-123",
        size: 1024,
      });

      await tenantContext.run({ ownerId: OWNER }, async () => {
        const resource = await createResourceWithUpload(
          OWNER,
          { projectId, listId, title: "Valid PDF", type: "pdf" },
          fakeStorage as any,
          {} as any, // fake stream
          "application/pdf",
        );
        expect(resource.title).toBe("Valid PDF");
        expect(resource.status).toBe("ready");
        expect(resource.driveFileId).toBe("drive-123");
        expect(resource.size).toBe(1024);
        expect(fakeStorage.uploadFile).toHaveBeenCalled();
      });
    });

    it("should rollback and delete pending resource if upload fails", async () => {
      fakeStorage.uploadFile.mockRejectedValueOnce(new Error("Upload boom"));

      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          createResourceWithUpload(
            OWNER,
            { projectId, listId, title: "Fail PDF", type: "pdf" },
            fakeStorage as any,
            {} as any,
            "application/pdf",
          ),
        ).rejects.toThrow("Upload boom");

        // Verify the resource was rolled back
        const exists = await ResourceModel.findOne({ title: "Fail PDF" });
        expect(exists).toBeNull();
      });
    });
  });
});
