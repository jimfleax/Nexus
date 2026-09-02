/**
 * @file list.service.test.ts
 * @description Unit tests for the list service business logic.
 * @architecture Tests the service functions directly with in-memory MongoDB, no HTTP layer involved.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import {
  listByProject,
  findListById,
  createList,
  updateList,
  reorderLists,
} from "../src/services/list.service.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const OWNER = "list-svc-test-user";
let projectId: string;

describe("ListService", () => {
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
    await ProjectModel.createCollection();
    await ProjectModel.init();
    await KnowledgeListModel.createCollection();
    await KnowledgeListModel.init();

    // Seed a project for list tests
    await tenantContext.run({ ownerId: OWNER }, async () => {
      const project = await ProjectModel.create({
        ownerId: OWNER,
        name: "Test Project",
        slug: "test-project",
      });
      projectId = project._id.toString();
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("createList", () => {
    it("should create a list with auto-slug and position 0", async () => {
      const list = await tenantContext.run({ ownerId: OWNER }, async () => {
        return createList(projectId, {
          name: "First List",
          description: "desc",
        });
      });

      expect(list.name).toBe("First List");
      expect(list.slug).toBe("first-list");
      expect(list.position).toBe(0);
      expect(list.projectId).toBe(projectId);
    });

    it("should append to end with incrementing position", async () => {
      const list = await tenantContext.run({ ownerId: OWNER }, async () => {
        return createList(projectId, { name: "Second List" });
      });

      expect(list.position).toBe(1);
    });

    it("should throw if project does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          createList(fakeId, { name: "No Project" }),
        ).rejects.toThrow("Project not found");
      });
    });

    it("should throw on duplicate name in same project", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          createList(projectId, { name: "First List" }),
        ).rejects.toMatchObject({ code: 11000 });
      });
    });
  });

  describe("listByProject", () => {
    it("should return lists sorted by position", async () => {
      const lists = await tenantContext.run({ ownerId: OWNER }, async () => {
        return listByProject(projectId);
      });

      expect(lists).toHaveLength(2);
      expect(lists[0].name).toBe("First List");
      expect(lists[1].name).toBe("Second List");
      expect(lists[0].position).toBeLessThan(lists[1].position);
    });
  });

  describe("findListById", () => {
    it("should find a list by ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await KnowledgeListModel.find({}, null, {
          skipTenant: true,
        });
        const found = await findListById(all[0]._id.toString());
        expect(found).not.toBeNull();
        expect(found!.name).toBe("First List");
      });
    });

    it("should return null for nonexistent ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const found = await findListById(fakeId);
        expect(found).toBeNull();
      });
    });
  });

  describe("updateList", () => {
    it("should update name and regenerate slug", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await KnowledgeListModel.find({}, null, {
          skipTenant: true,
        });
        const updated = await updateList(all[0]._id.toString(), {
          name: "Renamed List",
        });
        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Renamed List");
        expect(updated!.slug).toBe("renamed-list");
      });
    });
  });

  describe("reorderLists", () => {
    it("should update positions atomically", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const all = await KnowledgeListModel.find({}, null, {
          skipTenant: true,
        });
        const items = all.map((list, i) => ({
          id: list._id.toString(),
          position: all.length - 1 - i, // reverse order
        }));

        await reorderLists(projectId, OWNER, items);

        const reordered = await listByProject(projectId);
        expect(reordered[0].name).toBe("Second List");
        expect(reordered[1].name).toBe("Renamed List");
      });
    });

    it("should handle empty items array", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          reorderLists(projectId, OWNER, []),
        ).resolves.toBeUndefined();
      });
    });
  });
});
