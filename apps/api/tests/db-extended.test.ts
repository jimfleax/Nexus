import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { tenantContext, tenantIsolationPlugin } from "../src/db.js";

let mongoServer: MongoMemoryServer;

const TestSchema = new mongoose.Schema({ group: String, value: Number });
TestSchema.plugin(tenantIsolationPlugin);
// Use a unique name to avoid OverwriteModelError in case of parallel test runs
const TestModel = mongoose.model("TenantExtendedTest", TestSchema);

const as = async (ownerId: string | null, fn: () => Promise<any>) =>
  new Promise<void>((resolve, reject) => {
    if (ownerId === null) {
      fn().then(resolve).catch(reject);
      return;
    }
    tenantContext.run({ ownerId }, async () => {
      try {
        await fn();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await TestModel.deleteMany({}, { skipTenant: true });
  await as("u1", () => TestModel.create({ group: "a", value: 1 }));
  await as("u1", () => TestModel.create({ group: "b", value: 2 }));
  await as("u2", () => TestModel.create({ group: "c", value: 3 }));
});
