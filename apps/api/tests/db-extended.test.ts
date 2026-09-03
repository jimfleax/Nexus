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

describe("skipTenant queries", () => {
  it("find with skipTenant sees all tenants", async () => {
    const docs = await TestModel.find({}, null, { skipTenant: true });
    expect(docs.length).toBe(3);
  });

  it("find with skipTenant outside context does not throw", async () => {
    await expect(
      as(null, async () => {
        const docs = await TestModel.find({}, null, { skipTenant: true });
        expect(docs.length).toBe(3);
      }),
    ).resolves.not.toThrow();
  });

  it("deleteMany with skipTenant deletes across tenants", async () => {
    await TestModel.deleteMany({}, { skipTenant: true } as any);
    const count = await TestModel.countDocuments({}, {
      skipTenant: true,
    } as any);
    expect(count).toBe(0);
  });

  it("updateMany with skipTenant updates across tenants", async () => {
    await TestModel.updateMany({}, { $set: { value: 99 } }, {
      skipTenant: true,
    } as any);
    const docs = await TestModel.find({}, null, { skipTenant: true } as any);
    expect(docs.every((d) => d.value === 99)).toBe(true);
  });
});

describe("Aggregate injection", () => {
  it("prepends $match on ownerId inside context", async () => {
    await as("u1", async () => {
      const results = await TestModel.aggregate([
        { $group: { _id: "$group" } },
      ]);
      expect(results.length).toBe(2);
      const groups = results.map((r) => r._id).sort();
      expect(groups).toEqual(["a", "b"]);
    });
  });

  it("throws when aggregate is called outside context without skipTenant", async () => {
    await expect(
      as(null, async () => {
        await TestModel.aggregate([{ $group: { _id: "$group" } }]);
      }),
    ).rejects.toThrow(
      "Tenant context missing. Set skipTenant: true to bypass.",
    );
  });

  it("bypasses context throw when option skipTenant: true is passed", async () => {
    await expect(
      as(null, async () => {
        const results = await TestModel.aggregate([
          { $group: { _id: "$group" } },
        ]).option({ skipTenant: true });
        expect(results.length).toBe(3);
      }),
    ).resolves.not.toThrow();
  });
});

describe("Save mismatch and local bypass", () => {
  it("throws if saving a doc with ownerId differing from context", async () => {
    await expect(
      as("u1", async () => {
        const d = new TestModel({ ownerId: "u2", group: "d", value: 4 });
        await d.save();
      }),
    ).rejects.toThrow("Tenant context mismatch on save.");
  });

  it("succeeds if saving with explicit matching ownerId", async () => {
    await expect(
      as("u1", async () => {
        const d = new TestModel({ ownerId: "u1", group: "d", value: 4 });
        await d.save();
      }),
    ).resolves.not.toThrow();
  });

  it("bypasses context throw if $locals.skipTenant is true", async () => {
    await expect(
      as(null, async () => {
        const d = new TestModel({ ownerId: "u3", group: "d", value: 4 });
        d.$locals = { skipTenant: true };
        await d.save();
      }),
    ).resolves.not.toThrow();
  });
});

describe("Index auto-creation", () => {
  it("adds ownerId path with required and index true", () => {
    const s = new mongoose.Schema({ x: String });
    s.plugin(tenantIsolationPlugin);
    const path: any = s.path("ownerId");
    expect(path).toBeTruthy();
    expect(path.instance).toBe("String");
    expect(path.options.required).toBe(true);
    expect(path.options.index).toBe(true);
  });

  it("does not duplicate ownerId if already present", () => {
    const s = new mongoose.Schema({
      x: String,
      ownerId: { type: String, required: true },
    });
    s.plugin(tenantIsolationPlugin);
    const path: any = s.path("ownerId");
    expect(path).toBeTruthy();
    // It shouldn't crash or throw, and the path remains
  });
});

describe("Implicit tenant filter isolation", () => {
  it("countDocuments inside context counts only tenant", async () => {
    await as("u1", async () => {
      const c = await TestModel.countDocuments();
      expect(c).toBe(2);
    });
  });

  it("deleteOne inside context deletes only tenant's doc", async () => {
    await as("u1", async () => {
      await TestModel.deleteOne({ group: "a" });
    });
    const c1 = await TestModel.countDocuments(
      { ownerId: "u1" },
      { skipTenant: true },
    );
    const c2 = await TestModel.countDocuments(
      { ownerId: "u2" },
      { skipTenant: true },
    );
    expect(c1).toBe(1);
    expect(c2).toBe(1);
  });

  it("deleteMany inside context deletes only tenant", async () => {
    await as("u1", async () => {
      await TestModel.deleteMany({});
    });
    const c1 = await TestModel.countDocuments(
      { ownerId: "u1" },
      { skipTenant: true },
    );
    const c2 = await TestModel.countDocuments(
      { ownerId: "u2" },
      { skipTenant: true },
    );
    expect(c1).toBe(0);
    expect(c2).toBe(1);
  });

  it("updateMany inside context affects only tenant", async () => {
    await as("u1", async () => {
      await TestModel.updateMany({}, { $set: { value: 5 } });
    });
    const u1Docs = await TestModel.find({ ownerId: "u1" }, null, {
      skipTenant: true,
    });
    const u2Docs = await TestModel.find({ ownerId: "u2" }, null, {
      skipTenant: true,
    });
    expect(u1Docs.every((d) => d.value === 5)).toBe(true);
    expect(u2Docs[0].value).toBe(3);
  });

  it("findOneAndUpdate inside context scoped to tenant", async () => {
    await as("u1", async () => {
      const updated = await TestModel.findOneAndUpdate(
        { group: "a" },
        { $set: { value: 7 } },
        { new: true },
      );
      expect(updated?.value).toBe(7);
    });

    // U2 tries to update U1's doc (should fail / be null)
    await as("u2", async () => {
      const updated = await TestModel.findOneAndUpdate(
        { group: "a" },
        { $set: { value: 9 } },
        { new: true },
      );
      expect(updated).toBeNull();
    });
  });
});
