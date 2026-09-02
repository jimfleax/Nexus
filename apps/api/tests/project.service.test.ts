/**
 * @file project.service.test.ts
 * @description Unit tests for the project service business logic.
 * @architecture Tests the service functions directly with in-memory MongoDB, no HTTP layer involved.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import {
  listProjectsWithCounts,
  createProject,
  updateProject,
  findProjectById,
} from "../src/services/project.service.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDB } from "../src/db.js";

const OWNER = "svc-test-user";

describe("ProjectService", () => {
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
    await ProjectModel.createCollection();
    await ProjectModel.init();
    await KnowledgeListModel.createCollection();
    await KnowledgeListModel.init();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("createProject", () => {
    it("should create a project with an auto-generated slug", async () => {
      const project = await tenantContext.run({ ownerId: OWNER }, async () => {
        return createProject({
          name: "My Test Project",
          description: "A test",
        });
      });

      expect(project.name).toBe("My Test Project");
      expect(project.slug).toBe("my-test-project");
      expect(project.description).toBe("A test");
    });

    it("should throw on duplicate name (same owner)", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await expect(
          createProject({ name: "My Test Project" }),
        ).rejects.toMatchObject({ code: 11000 });
      });
    });
  });

  describe("findProjectById", () => {
    it("should find a project by ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const projects = await ProjectModel.find({}, null, {
          skipTenant: true,
        });
        const found = await findProjectById(projects[0]._id.toString());
        expect(found).not.toBeNull();
        expect(found!.name).toBe("My Test Project");
      });
    });

    it("should return null for nonexistent ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const found = await findProjectById(fakeId);
        expect(found).toBeNull();
      });
    });
  });

  describe("updateProject", () => {
    it("should update name and regenerate slug", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const projects = await ProjectModel.find({}, null, {
          skipTenant: true,
        });
        const updated = await updateProject(projects[0]._id.toString(), {
          name: "Renamed Project",
        });
        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Renamed Project");
        expect(updated!.slug).toBe("renamed-project");
      });
    });

    it("should return null for nonexistent project", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const result = await updateProject(fakeId, { name: "Nope" });
        expect(result).toBeNull();
      });
    });
  });

  describe("listProjectsWithCounts", () => {
    it("should return projects with correct listCount", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        // Clean slate
        await ProjectModel.deleteMany({}, { skipTenant: true } as any);
        await KnowledgeListModel.deleteMany({}, { skipTenant: true } as any);

        const p1 = await createProject({ name: "Project A" });
        const p2 = await createProject({ name: "Project B" });

        // Add 2 lists to Project A
        await KnowledgeListModel.create([
          {
            ownerId: OWNER,
            projectId: String(p1._id),
            name: "List A1",
            slug: "list-a1",
            position: 0,
          },
          {
            ownerId: OWNER,
            projectId: String(p1._id),
            name: "List A2",
            slug: "list-a2",
            position: 1,
          },
        ]);

        // Add 1 list to Project B
        await KnowledgeListModel.create({
          ownerId: OWNER,
          projectId: String(p2._id),
          name: "List B1",
          slug: "list-b1",
          position: 0,
        });

        const projects = await listProjectsWithCounts();
        expect(projects).toHaveLength(2);

        const a = projects.find((p: any) => p.name === "Project A");
        const b = projects.find((p: any) => p.name === "Project B");
        expect(a!.listCount).toBe(2);
        expect(b!.listCount).toBe(1);
      });
    });
  });
});
