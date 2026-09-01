import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import Fastify from "fastify";
import { connectDB, tenantContext } from "../src/db.js";
import { userRoutes } from "../src/routes/user.js";
import { ResourceModel } from "../src/models/Resource.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";

let mongoServer: MongoMemoryServer;
let app: any;
let fakeAdapter: FakeStorageAdapter;
let mockGetDriveQuota: any;

describe("GET /api/user/metrics", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorateRequest("ownerId", null);

    fakeAdapter = new FakeStorageAdapter();
    mockGetDriveQuota = vi.spyOn(fakeAdapter, "getQuota");
    app.register(storagePlugin, { adapter: fakeAdapter });

    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      const ownerId = request.headers["x-test-owner"] || "test-user-1";
      request.ownerId = ownerId;
      tenantContext.run({ ownerId }, () => {
        done();
      });
    });

    app.register(userRoutes);
    await app.ready();

    const seed = async (ownerId: string, data: any) =>
      new Promise<void>((resolve) =>
        tenantContext.run({ ownerId }, async () => {
          await data();
          resolve();
        }),
      );

    // user-1: two projects, two lists, mixed resources with known sizes
    await seed("test-user-1", async () => {
      await ProjectModel.create([
        { name: "P1", slug: "p1" },
        { name: "P2", slug: "p2" },
      ]);
      await KnowledgeListModel.create([
        { projectId: "p1", name: "L1", slug: "l1", position: 0 },
        { projectId: "p1", name: "L2", slug: "l2", position: 1 },
      ]);
      await ResourceModel.create([
        {
          projectId: "p1",
          listId: "l1",
          title: "PDF A",
          type: "pdf",
          size: 200,
        },
        {
          projectId: "p1",
          listId: "l1",
          title: "PDF B",
          type: "pdf",
          size: 300,
        },
        {
          projectId: "p1",
          listId: "l2",
          title: "Image C",
          type: "image",
          size: 150,
        },
        {
          projectId: "p1",
          listId: "l2",
          title: "MD D",
          type: "markdown",
          size: 50,
        },
        // no size -> not counted in usedByNexus / byType sum
        {
          projectId: "p1",
          listId: "l2",
          title: "Note E",
          type: "note",
        },
        {
          projectId: "p1",
          listId: "l2",
          title: "URL F",
          type: "url",
        },
      ]);
      await UserModel.create({
        ownerId: "test-user-1",
        driveRefreshToken: "token-1",
      });
    });

    // user-2: different data to prove isolation
    await seed("test-user-2", async () => {
      await ProjectModel.create({ name: "P-u2", slug: "pu2" });
      await ResourceModel.create([
        {
          projectId: "pu2",
          listId: "lu2",
          title: "U2 Doc",
          type: "pdf",
          size: 9999,
        },
      ]);
      await UserModel.create({
        ownerId: "test-user-2",
        driveRefreshToken: "token-2",
      });
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(() => {
    mockGetDriveQuota.mockReset();
  });

  it("aggregates storage and counts for the current user", async () => {
    mockGetDriveQuota.mockResolvedValue({
      usedInDrive: 1000,
      limit: 5000,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/user/metrics",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);

    // 200 + 300 + 150 + 50 = 700 bytes from drive-backed files
    expect(data.usedByNexus).toBe(700);
    expect(data.resourceCount).toBe(6);
    expect(data.projectCount).toBe(2);
    expect(data.listCount).toBe(2);

    // byType breakdown only for storage-bearing types
    expect(data.byType).toEqual({
      pdf: 500,
      image: 150,
      markdown: 50,
      ebook: 0,
      text: 0,
    });
  });

  it("returns drive quota with remaining = limit - usedInDrive", async () => {
    mockGetDriveQuota.mockResolvedValue({
      usedInDrive: 1000,
      limit: 5000,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/user/metrics",
    });

    const data = JSON.parse(response.payload);
    expect(data.drive).toEqual({
      connected: true,
      usedInDrive: 1000,
      limit: 5000,
      remaining: 4000,
    });
  });

  it("reports drive not connected when the user has no drive quota", async () => {
    mockGetDriveQuota.mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/user/metrics",
    });

    const data = JSON.parse(response.payload);
    expect(data.drive.connected).toBe(false);
    expect(data.drive.usedInDrive).toBeNull();
    expect(data.drive.limit).toBeNull();
    expect(data.drive.remaining).toBeNull();
  });

  it("treats an unlimited drive quota (null limit) with remaining as null", async () => {
    mockGetDriveQuota.mockResolvedValue({
      usedInDrive: 1000,
      limit: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/user/metrics",
    });

    const data = JSON.parse(response.payload);
    expect(data.drive.connected).toBe(true);
    expect(data.drive.limit).toBeNull();
    expect(data.drive.remaining).toBeNull();
  });

  it("does not count another tenant's data", async () => {
    mockGetDriveQuota.mockResolvedValue({ usedInDrive: 1, limit: 10 });

    const response = await app.inject({
      method: "GET",
      url: "/api/user/metrics",
      headers: { "x-test-owner": "test-user-2" },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    // Only user-2's single resource (9999 bytes) counts
    expect(data.resourceCount).toBe(1);
    expect(data.usedByNexus).toBe(9999);
    expect(data.byType.pdf).toBe(9999);
  });
});
