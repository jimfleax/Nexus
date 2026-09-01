import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantIsolationPlugin, tenantContext } from "../src/db";

import { MongoMemoryServer } from "mongodb-memory-server";

const UserDataSchema = new mongoose.Schema({
  data: String,
});
UserDataSchema.plugin(tenantIsolationPlugin);
const UserData = mongoose.model("UserData", UserDataSchema);

let mongoServer: MongoMemoryServer;

describe("Mongoose Tenant Isolation", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await UserData.deleteMany({}, { skipTenant: true });
  }, 60000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("should enforce ownerId on save", async () => {
    await new Promise<void>((resolve, reject) => {
      tenantContext.run({ ownerId: "user-1" }, async () => {
        try {
          const doc = new UserData({ data: "hello 1" });
          await doc.save();
          expect((doc as any).ownerId).toBe("user-1");
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should fail to save if no tenant context", async () => {
    const doc = new UserData({ data: "hello 2" });
    await expect(doc.save()).rejects.toThrow("Tenant context missing on save.");
  });

  it("should isolate queries by tenant", async () => {
    // Setup test data
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "user-A" }, async () => {
        await UserData.create({ data: "A data 1" });
        await UserData.create({ data: "A data 2" });
        resolve();
      }),
    );
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "user-B" }, async () => {
        await UserData.create({ data: "B data 1" });
        resolve();
      }),
    );

    // Query as A
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "user-A" }, async () => {
        const docs = await UserData.find();
        expect(docs).toHaveLength(2);
        expect(docs.every((d) => (d as any).ownerId === "user-A")).toBe(true);
        resolve();
      }),
    );

    // Query as B
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "user-B" }, async () => {
        const docs = await UserData.find();
        expect(docs).toHaveLength(1);
        expect((docs[0] as any).ownerId).toBe("user-B");
        resolve();
      }),
    );
  });

  it("fail-closed if no tenant context on find", async () => {
    await expect(UserData.find()).rejects.toThrow(
      "Tenant context missing. Set skipTenant: true to bypass.",
    );
  });
});
