/**
 * @file gc.test.ts
 * @description Tests for the garbage collection module (runGarbageCollection).
 * @architecture Tests GC behavior with in-memory MongoDB and mocked googleapis.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import mongoose from "mongoose";
import { tenantContext, connectDB } from "../src/db.js";
import { ResourceModel } from "../src/models/Resource.js";
import { UserModel } from "../src/models/User.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Mock googleapis to avoid real Drive API calls
const mockDelete = vi.fn().mockResolvedValue({});
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(function (this: any) {
        this.setCredentials = vi.fn();
        this.getAccessToken = vi
          .fn()
          .mockResolvedValue({ token: "mock-token" });
      }),
    },
    drive: vi.fn().mockImplementation(function () {
      return { files: { delete: mockDelete } };
    }),
  },
}));

// Import after mock setup
import { runGarbageCollection } from "../src/gc.js";

describe("GarbageCollection", () => {
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

  beforeEach(async () => {
    // Clean slate
    await ResourceModel.deleteMany({}, { skipTenant: true } as any);
    await UserModel.deleteMany({});
    mockDelete.mockClear();
  });

  it("should delete stale pending resources older than 30 minutes", async () => {
    const staleTime = new Date(Date.now() - 31 * 60 * 1000); // 31 min ago

    await tenantContext.run({ ownerId: "gc-user-1" }, async () => {
      // Use insertMany with timestamps:false to set a truly stale updatedAt
      await ResourceModel.collection.insertOne({
        ownerId: "gc-user-1",
        projectId: "p1",
        listId: "l1",
        title: "Stale Resource",
        type: "note",
        status: "pending",
        updatedAt: staleTime,
        createdAt: staleTime,
      });
    });

    await runGarbageCollection();

    const remaining = await ResourceModel.countDocuments(
      { status: "pending" },
      { skipTenant: true } as any,
    );
    expect(remaining).toBe(0);
  });

  it("should NOT delete pending resources newer than 30 minutes", async () => {
    const recentTime = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago

    await tenantContext.run({ ownerId: "gc-user-2" }, async () => {
      await ResourceModel.collection.insertOne({
        ownerId: "gc-user-2",
        projectId: "p1",
        listId: "l1",
        title: "Recent Pending",
        type: "note",
        status: "pending",
        updatedAt: recentTime,
        createdAt: recentTime,
      });
    });

    await runGarbageCollection();

    const remaining = await ResourceModel.countDocuments(
      { status: "pending" },
      { skipTenant: true } as any,
    );
    expect(remaining).toBe(1);
  });

  it("should NOT delete resources with status 'ready'", async () => {
    const staleTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await tenantContext.run({ ownerId: "gc-user-3" }, async () => {
      await ResourceModel.collection.insertOne({
        ownerId: "gc-user-3",
        projectId: "p1",
        listId: "l1",
        title: "Ready Resource",
        type: "note",
        status: "ready",
        updatedAt: staleTime,
        createdAt: staleTime,
      });
    });

    await runGarbageCollection();

    const remaining = await ResourceModel.countDocuments({ status: "ready" }, {
      skipTenant: true,
    } as any);
    expect(remaining).toBe(1);
  });

  it("should delete Drive files for stale resources with driveFileId", async () => {
    const staleTime = new Date(Date.now() - 45 * 60 * 1000);

    // Create user with Drive token
    await UserModel.create({
      ownerId: "gc-user-4",
      driveRefreshToken: "drive-token-4",
    });

    await tenantContext.run({ ownerId: "gc-user-4" }, async () => {
      await ResourceModel.collection.insertOne({
        ownerId: "gc-user-4",
        projectId: "p1",
        listId: "l1",
        title: "Stale with Drive file",
        type: "pdf",
        status: "pending",
        driveFileId: "drive-file-123",
        updatedAt: staleTime,
        createdAt: staleTime,
      });
    });

    await runGarbageCollection();

    // Should have attempted to delete the Drive file
    expect(mockDelete).toHaveBeenCalledWith({ fileId: "drive-file-123" });

    // Resource should be gone
    const remaining = await ResourceModel.countDocuments(
      { driveFileId: "drive-file-123" },
      { skipTenant: true } as any,
    );
    expect(remaining).toBe(0);
  });

  it("should skip Drive file deletion when user has no refresh token", async () => {
    const staleTime = new Date(Date.now() - 45 * 60 * 1000);

    // Create user WITHOUT Drive token
    await UserModel.create({
      ownerId: "gc-user-5",
    });

    await tenantContext.run({ ownerId: "gc-user-5" }, async () => {
      await ResourceModel.collection.insertOne({
        ownerId: "gc-user-5",
        projectId: "p1",
        listId: "l1",
        title: "Stale no token",
        type: "pdf",
        status: "pending",
        driveFileId: "drive-file-456",
        updatedAt: staleTime,
        createdAt: staleTime,
      });
    });

    await runGarbageCollection();

    // Should NOT have tried to delete Drive file (no token)
    expect(mockDelete).not.toHaveBeenCalled();

    // But resource should still be deleted from DB
    const remaining = await ResourceModel.countDocuments(
      { driveFileId: "drive-file-456" },
      { skipTenant: true } as any,
    );
    expect(remaining).toBe(0);
  });

  it("should handle multiple stale resources in one sweep", async () => {
    const staleTime = new Date(Date.now() - 60 * 60 * 1000);

    await tenantContext.run({ ownerId: "gc-user-6" }, async () => {
      await ResourceModel.collection.insertMany([
        {
          ownerId: "gc-user-6",
          projectId: "p1",
          listId: "l1",
          title: "Stale 1",
          type: "note",
          status: "pending",
          updatedAt: staleTime,
          createdAt: staleTime,
        },
        {
          ownerId: "gc-user-6",
          projectId: "p1",
          listId: "l1",
          title: "Stale 2",
          type: "note",
          status: "pending",
          updatedAt: staleTime,
          createdAt: staleTime,
        },
        {
          ownerId: "gc-user-6",
          projectId: "p1",
          listId: "l1",
          title: "Stale 3",
          type: "note",
          status: "pending",
          updatedAt: staleTime,
          createdAt: staleTime,
        },
      ]);
    });

    await runGarbageCollection();

    const remaining = await ResourceModel.countDocuments(
      { status: "pending" },
      { skipTenant: true } as any,
    );
    expect(remaining).toBe(0);
  });

  it("should not run GC concurrently (guard flag)", async () => {
    const staleTime = new Date(Date.now() - 60 * 60 * 1000);
    await tenantContext.run({ ownerId: "gc-user-concurrent" }, async () => {
      await UserModel.create({
        ownerId: "gc-user-concurrent",
        driveRefreshToken: "mock-refresh",
      });
      await ResourceModel.create({
        ownerId: "gc-user-concurrent",
        projectId: "p1",
        listId: "l1",
        title: "Concurrent Stale",
        type: "pdf",
        status: "pending",
        driveFileId: "delayed-file-id",
        updatedAt: staleTime,
        createdAt: staleTime,
      });
    });

    let deleteCallCount = 0;
    let resolveFirstSweep: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolveFirstSweep = res;
    });

    let deleteCalledResolve: () => void;
    const deleteCalledPromise = new Promise<void>((res) => {
      deleteCalledResolve = res;
    });

    mockDelete.mockImplementation(async () => {
      deleteCallCount++;
      deleteCalledResolve();
      await lockPromise;
      return {};
    });

    // Start the first sweep
    const p1 = runGarbageCollection();

    // Wait until the delay/Drive deletion is reached (meaning the first sweep holds the lock)
    await deleteCalledPromise;

    // Invoke the second sweep
    const p2 = runGarbageCollection();
    await p2;

    // Assert that the deletion occurs exactly once before allowing the first sweep to finish
    expect(deleteCallCount).toBe(1);

    // Allow the first sweep to finish
    resolveFirstSweep!();
    await p1;

    mockDelete.mockResolvedValue({});
  });
});
