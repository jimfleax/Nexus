import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { infoRoutes } from "../src/routes/info.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ResourceModel } from "../src/models/Resource.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;
let pId: string;
let l1Id: string;
let l2Id: string;
let r1Id: string;
let emptyPId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    const ownerId = request.headers["x-test-owner"] || "test-user-1";
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.register(infoRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ProjectModel.deleteMany({}, { skipTenant: true });
    await KnowledgeListModel.deleteMany({}, { skipTenant: true });
    await ResourceModel.deleteMany({}, { skipTenant: true });

    const p = await ProjectModel.create({
      name: "Proj",
      slug: "proj",
      description: "d",
    });
    pId = p._id.toString();

    const emptyP = await ProjectModel.create({ name: "Empty", slug: "empty" });
    emptyPId = emptyP._id.toString();

    const l1 = await KnowledgeListModel.create({
      projectId: pId,
      name: "List",
      slug: "list",
      position: 0,
      description: "ld",
    });
    l1Id = l1._id.toString();

    const r1 = await ResourceModel.create({
      projectId: pId,
      listId: l1Id,
      title: "Res",
      type: "pdf",
      mimeType: "application/pdf",
      size: 100,
      status: "ready",
      readingTime: "5 min",
    });
    r1Id = r1._id.toString();

    const l2 = await KnowledgeListModel.create({
      projectId: pId,
      name: "List2",
      slug: "list2",
      position: 1,
    });
    l2Id = l2._id.toString();
    await ResourceModel.create({
      projectId: pId,
      listId: l2Id,
      title: "Res2",
      type: "note",
    });
  });
});

describe("GET /api/info success paths", () => {
  it("returns project info with counts", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=project&id=${pId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      type: "project",
      name: "Proj",
      description: "d",
      listCount: 2,
      resourceCount: 2,
    });
  });

  it("returns project with zero lists/resources", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=project&id=${emptyPId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ listCount: 0, resourceCount: 0 });
  });

  it("returns list info with resource count", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=list&id=${l1Id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      type: "list",
      name: "List",
      description: "ld",
      resourceCount: 1,
    });
  });

  it("returns resource info with metadata", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=resource&id=${r1Id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      type: "resource",
      name: "Res",
      resourceType: "pdf",
      mimeType: "application/pdf",
      size: 100,
      status: "ready",
      readingTime: "5 min",
    });
  });
});

describe("GET /api/info errors & isolation", () => {
  it("returns 400 for invalid type enum", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=bogus&id=${pId}`,
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for missing id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/info?type=project",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for nonexistent project", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=project&id=${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for nonexistent list", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=list&id=${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for nonexistent resource", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=resource&id=${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for another tenant's project (isolation)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/info?type=project&id=${pId}`,
      headers: { "x-test-owner": "test-user-2" },
    });
    expect(res.statusCode).toBe(404);
  });
});
