import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { withTransaction } from "../src/utils/transactions.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const OWNER = "transactions-test-user";

describe("transactions", () => {
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

  describe("withTransaction", () => {
    it("should commit operations on success", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        await withTransaction(async (session) => {
          await ProjectModel.create(
            [{ ownerId: OWNER, name: "Tx Project 1", slug: "tx-project-1" }],
            { session },
          );
        });

        const count = await ProjectModel.countDocuments({
          slug: "tx-project-1",
        });
        expect(count).toBe(1);
      });
    });

    it("should abort operations on error", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        try {
          await withTransaction(async (session) => {
            await ProjectModel.create(
              [{ ownerId: OWNER, name: "Tx Project 2", slug: "tx-project-2" }],
              { session },
            );
            throw new Error("Simulated failure");
          });
        } catch (e) {
          // Expected
        }

        const count = await ProjectModel.countDocuments({
          slug: "tx-project-2",
        });
        expect(count).toBe(0);
      });
    });
  });
});
