/**
 * @file user.service.test.ts
 * @description Unit tests for the user service business logic.
 * @architecture Tests the service functions directly with in-memory MongoDB, no HTTP layer involved.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { tenantContext, connectDB } from "../src/db.js";
import { UserModel } from "../src/models/User.js";
import { ResourceModel } from "../src/models/Resource.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import {
  findOrCreateUser,
  getSettings,
  updateSettings,
  getFavorites,
  getRecent,
  getMetrics,
} from "../src/services/user.service.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const OWNER = "user-svc-test";

describe("UserService", () => {
  let mongoServer: MongoMemoryReplSet;
  let fakeStorage: FakeStorageAdapter;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
    fakeStorage = new FakeStorageAdapter();

    // Seed data
    await tenantContext.run({ ownerId: OWNER }, async () => {
      await ProjectModel.create([
        { ownerId: OWNER, name: "P1", slug: "p1" },
        { ownerId: OWNER, name: "P2", slug: "p2" },
      ]);
      await KnowledgeListModel.create([
        {
          ownerId: OWNER,
          projectId: "p1",
          name: "L1",
          slug: "l1",
          position: 0,
        },
        {
          ownerId: OWNER,
          projectId: "p1",
          name: "L2",
          slug: "l2",
          position: 1,
        },
      ]);
      await ResourceModel.create([
        {
          ownerId: OWNER,
          projectId: "p1",
          listId: "l1",
          title: "Fav 1",
          type: "pdf",
          isFavorite: true,
          size: 100,
          lastOpenedAt: new Date(Date.now() - 1000),
        },
        {
          ownerId: OWNER,
          projectId: "p1",
          listId: "l1",
          title: "Fav 2",
          type: "image",
          isFavorite: true,
          size: 200,
          lastOpenedAt: new Date(Date.now() - 5000),
        },
        {
          ownerId: OWNER,
          projectId: "p1",
          listId: "l2",
          title: "Not Fav",
          type: "markdown",
          isFavorite: false,
          size: 50,
        },
      ]);
    });

    await UserModel.create({
      ownerId: OWNER,
      driveRefreshToken: "test-token",
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe("findOrCreateUser", () => {
    it("should return existing user", async () => {
      const user = await findOrCreateUser(OWNER);
      expect(user).not.toBeNull();
      expect(user.ownerId).toBe(OWNER);
      expect(user.driveRefreshToken).toBe("test-token");
    });

    it("should create a new user if not found", async () => {
      const newUser = await findOrCreateUser("new-user-999");
      expect(newUser).not.toBeNull();
      expect(newUser.ownerId).toBe("new-user-999");
    });
  });

  describe("getSettings / updateSettings", () => {
    it("should return current settings", async () => {
      const settings = await getSettings(OWNER);
      expect(settings.driveRefreshToken).toBe("test-token");
    });

    it("should update drive refresh token", async () => {
      const updated = await updateSettings(OWNER, {
        driveRefreshToken: "new-token",
      });
      expect(updated.driveRefreshToken).toBe("new-token");
    });

    it("should not change token when undefined is passed", async () => {
      const result = await updateSettings(OWNER, {});
      expect(result.driveRefreshToken).toBe("new-token"); // unchanged
    });
  });

  describe("getFavorites", () => {
    it("should return only favorited resources", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const favorites = await getFavorites();
        expect(favorites).toHaveLength(2);
        favorites.forEach((r: any) => expect(r.isFavorite).toBe(true));
        // content should be excluded
        expect((favorites[0] as any).content).toBeUndefined();
      });
    });
  });

  describe("getRecent", () => {
    it("should return resources sorted by lastOpenedAt", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const recent = await getRecent();
        expect(recent.length).toBeGreaterThan(0);
        // Most recently opened should be first
        expect(recent[0].title).toBe("Fav 1");
      });
    });

    it("should respect limit parameter", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const recent = await getRecent(1);
        expect(recent).toHaveLength(1);
      });
    });
  });

  describe("getMetrics", () => {
    it("should aggregate storage metrics correctly", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const metrics = await getMetrics(OWNER, fakeStorage);

        // 100 + 200 + 50 = 350 total bytes
        expect(metrics.usedByNexus).toBe(350);
        expect(metrics.resourceCount).toBe(3);
        expect(metrics.projectCount).toBe(2);
        expect(metrics.listCount).toBe(2);

        expect(metrics.byType).toEqual({
          pdf: 100,
          image: 200,
          markdown: 50,
          ebook: 0,
          text: 0,
        });
      });
    });

    it("should include drive quota from storage adapter", async () => {
      await tenantContext.run({ ownerId: OWNER }, async () => {
        const metrics = await getMetrics(OWNER, fakeStorage);
        expect(metrics.drive.connected).toBe(true);
        expect(metrics.drive.usedInDrive).toBe(1000);
        expect(metrics.drive.limit).toBe(10000);
        expect(metrics.drive.remaining).toBe(9000);
      });
    });
  });
});
