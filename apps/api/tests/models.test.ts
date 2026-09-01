import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB } from "../src/db.js";
import { ResourceModel } from "../src/models/Resource.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { UserModel } from "../src/models/User.js";
import { tenantContext } from "../src/db.js";

let mongoServer: MongoMemoryServer;

describe("Model Validations", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("ResourceModel", () => {
    it("should fail validation if required fields are missing", async () => {
      const resource = new ResourceModel({});
      await tenantContext.run({ ownerId: "u1" }, async () => {
        try {
          await resource.validate();
          expect.fail("Should have thrown a validation error");
        } catch (error: any) {
          expect(error.errors.projectId).toBeDefined();
          expect(error.errors.listId).toBeDefined();
          expect(error.errors.title).toBeDefined();
          expect(error.errors.type).toBeDefined();
        }
      });
    });

    it("should fail validation if type is invalid enum", async () => {
      const resource = new ResourceModel({
        projectId: "p1",
        listId: "l1",
        title: "Test",
        type: "invalid-type",
        ownerId: "u1",
      });
      await tenantContext.run({ ownerId: "u1" }, async () => {
        try {
          await resource.validate();
          expect.fail("Should have thrown enum validation error");
        } catch (error: any) {
          expect(error.errors.type.kind).toBe("enum");
        }
      });
    });

    it("should pass validation with valid data", async () => {
      const resource = new ResourceModel({
        projectId: "p1",
        listId: "l1",
        title: "Test PDF",
        type: "pdf",
        ownerId: "u1",
      });
      await tenantContext.run({ ownerId: "u1" }, async () => {
        await expect(resource.validate()).resolves.toBeUndefined();
      });
    });
  });

  describe("ProjectModel", () => {
    it("should fail validation without ownerId or name", async () => {
      const project = new ProjectModel({});
      await tenantContext.run({ ownerId: "u1" }, async () => {
        try {
          await project.validate();
          expect.fail("Should have thrown a validation error");
        } catch (error: any) {
          expect(error.errors.name).toBeDefined();
        }
      });
    });
  });

  describe("KnowledgeListModel", () => {
    it("should fail validation without required fields", async () => {
      const list = new KnowledgeListModel({});
      await tenantContext.run({ ownerId: "u1" }, async () => {
        try {
          await list.validate();
          expect.fail("Should have thrown a validation error");
        } catch (error: any) {
          expect(error.errors.name).toBeDefined();

          expect(error.errors.projectId).toBeDefined();
        }
      });
    });
  });

  describe("UserModel", () => {
    it("should fail validation without authId or email", async () => {
      const user = new UserModel({});
      await tenantContext.run({ ownerId: "u1" }, async () => {
        try {
          await user.validate();
          expect.fail("Should have thrown a validation error");
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });
    });
  });
});
