import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { updateById } from "../src/services/db-utils.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const OWNER = "db-utils-test-user";

describe("db-utils", () => {
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("updateById", () => {
    it("should update and return new document", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const project = await ProjectModel.create({
          ownerId: OWNER,
          name: "Test Project",
          slug: "test-project",
        });

        const updated = await updateById(ProjectModel, project._id.toString(), {
          name: "Updated Project",
        });
        expect(updated).not.toBeNull();
        expect(updated!.name).toBe("Updated Project");
      });
    });

    it("should return null for nonexistent ID", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const fakeId = new mongoose.Types.ObjectId().toHexString();
        const updated = await updateById(ProjectModel, fakeId, {
          name: "Nonexistent",
        });
        expect(updated).toBeNull();
      });
    });
  });
});
