import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { runGarbageCollection } from "../src/gc.js";
import { ResourceModel } from "../src/models/Resource.js";
import { UserModel } from "../src/models/User.js";
import { connectDB, tenantContext } from "../src/db.js";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { google } from "googleapis";

const { filesDelete } = vi.hoisted(() => ({ filesDelete: vi.fn() }));
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function (this: any) {
        this.setCredentials = vi.fn();
      }),
    },
    drive: vi.fn().mockReturnValue({ files: { delete: filesDelete } }),
  },
}));

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  process.env.AUTH_GOOGLE_ID = "test-id";
  process.env.AUTH_GOOGLE_SECRET = "test-secret";
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDB(mongoServer.getUri());
  await ResourceModel.init();
}, 60000);

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  filesDelete.mockReset();
  await ResourceModel.deleteMany({}, { skipTenant: true } as any);
  await UserModel.deleteMany({}, { skipTenant: true } as any);
});

const seedResource = async (
  ownerId: string,
  updatedAt: Date,
  driveFileId?: string,
  status: string = "pending",
) =>
  tenantContext.run({ ownerId }, async () => {
    return ResourceModel.collection.insertOne({
      ownerId,
      projectId: new mongoose.Types.ObjectId().toHexString(),
      listId: new mongoose.Types.ObjectId().toHexString(),
      title: `test-res-${Math.random()}`,
      type: driveFileId ? "pdf" : "url",
      status,
      driveFileId,
      updatedAt,
      createdAt: updatedAt,
    });
  });

describe("runGarbageCollection sweeping logic", () => {
  it("sweeps stale pending resources and deletes their DB records", async () => {
    const now = Date.now();
    await seedResource("u1", new Date(now - 31 * 60 * 1000));
    await seedResource("u2", new Date(now - 35 * 60 * 1000));
    await seedResource("u3", new Date(now - 5 * 60 * 1000)); // fresh

    await runGarbageCollection();

    const remaining = await ResourceModel.find({}, null, { skipTenant: true });
    expect(remaining.length).toBe(1);
    expect(remaining[0].ownerId).toBe("u3");
  });

  it("leaves ready and error resources alone even if old", async () => {
    const now = Date.now();
    await seedResource(
      "u1",
      new Date(now - 120 * 60 * 1000),
      undefined,
      "ready",
    );
    await seedResource(
      "u2",
      new Date(now - 120 * 60 * 1000),
      undefined,
      "error",
    );

    await runGarbageCollection();

    const count = await ResourceModel.countDocuments({}, { skipTenant: true });
    expect(count).toBe(2);
  });
});

describe("runGarbageCollection drive deletion", () => {
  it("deletes the Drive file for stale resources with driveFileId and user token", async () => {
    await tenantContext.run({ ownerId: "u1" }, () =>
      UserModel.create({ ownerId: "u1", driveRefreshToken: "tok-1" }),
    );
    await seedResource("u1", new Date(Date.now() - 31 * 60 * 1000), "file-abc");

    await runGarbageCollection();

    expect(filesDelete).toHaveBeenCalledWith({ fileId: "file-abc" });
    const count = await ResourceModel.countDocuments({}, {
      skipTenant: true,
    } as any);
    expect(count).toBe(0);
  });

  it("does not delete Drive files when user row is missing", async () => {
    await seedResource("u1", new Date(Date.now() - 31 * 60 * 1000), "file-abc");
    await runGarbageCollection();
    expect(filesDelete).not.toHaveBeenCalled();
  });

  it("does not delete Drive files when user lacks driveRefreshToken", async () => {
    await tenantContext.run({ ownerId: "u1" }, () =>
      UserModel.create({ ownerId: "u1" }),
    );
    await seedResource("u1", new Date(Date.now() - 31 * 60 * 1000), "file-abc");
    await runGarbageCollection();
    expect(filesDelete).not.toHaveBeenCalled();
  });

  it("never throws, even if Drive deletion rejects, but keeps DB record", async () => {
    filesDelete.mockRejectedValueOnce(new Error("Drive API down"));
    await tenantContext.run({ ownerId: "u1" }, () =>
      UserModel.create({ ownerId: "u1", driveRefreshToken: "tok-1" }),
    );
    await seedResource("u1", new Date(Date.now() - 31 * 60 * 1000), "file-abc");

    await expect(runGarbageCollection()).resolves.toBeUndefined();
    // DB record should be kept so it can be retried next sweep
    const count = await ResourceModel.countDocuments({}, {
      skipTenant: true,
    } as any);
    expect(count).toBe(1);
  });
});

describe("runGarbageCollection concurrency and integration", () => {
  it("re-entrancy guard: second concurrent call is a no-op", async () => {
    // Make delete artificially slow to guarantee concurrent overlap
    let resolveDelete: any;
    const deletePromise = new Promise((r) => {
      resolveDelete = r;
    });
    filesDelete.mockReturnValueOnce(deletePromise);

    await tenantContext.run({ ownerId: "u1" }, () =>
      UserModel.create({ ownerId: "u1", driveRefreshToken: "tok-1" }),
    );
    await seedResource("u1", new Date(Date.now() - 31 * 60 * 1000), "file-abc");

    // Start first run (will hang on filesDelete)
    const run1 = runGarbageCollection();
    // Start second run synchronously
    const run2 = runGarbageCollection();

    resolveDelete();
    await Promise.all([run1, run2]);

    // Should only sweep once, so filesDelete only called once
    expect(filesDelete).toHaveBeenCalledTimes(1);
  });
});
