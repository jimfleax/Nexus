import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { listRoutes } from "../src/routes/lists.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
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
let listIds: string[]; // [a, b, c] pos [0,1,2]
let otherProjectListId: string;
let otherTenantListId: string;

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

  app.register(listRoutes);
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

    const p = await ProjectModel.create({ name: "P", slug: "p" });
    pId = p._id.toString();
    const a = await KnowledgeListModel.create({
      projectId: pId,
      name: "A",
      slug: "a",
      position: 0,
    });
    const b = await KnowledgeListModel.create({
      projectId: pId,
      name: "B",
      slug: "b",
      position: 1,
    });
    const c = await KnowledgeListModel.create({
      projectId: pId,
      name: "C",
      slug: "c",
      position: 2,
    });
    listIds = [a._id.toString(), b._id.toString(), c._id.toString()];

    const other = await ProjectModel.create({ name: "P2", slug: "p2" });
    const ol = await KnowledgeListModel.create({
      projectId: other._id.toString(),
      name: "OL",
      slug: "ol",
      position: 0,
    });
    otherProjectListId = ol._id.toString();
  });

  await tenantContext.run({ ownerId: "test-user-2" }, async () => {
    const p3 = await ProjectModel.create({ name: "P3", slug: "p3" });
    const l = await KnowledgeListModel.create({
      projectId: p3._id.toString(),
      name: "UL",
      slug: "ul",
      position: 0,
    });
    otherTenantListId = l._id.toString();
  });
});

describe("PUT /api/projects/:projectId/lists/reorder behavior", () => {
  it("fully reorders and changes positions", async () => {
    const payload = {
      items: [
        { id: listIds[0], position: 2 },
        { id: listIds[1], position: 0 },
        { id: listIds[2], position: 1 },
      ],
    };
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true });

    const lists = await KnowledgeListModel.find({ projectId: pId }, null, {
      skipTenant: true,
    }).sort({ position: 1 });
    expect(lists.map((l) => l.name)).toEqual(["B", "C", "A"]);
  });

  it("partially reorders (only some lists)", async () => {
    const payload = { items: [{ id: listIds[0], position: 5 }] };
    await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });

    const a = await KnowledgeListModel.findById(listIds[0], null, {
      skipTenant: true,
    });
    expect(a?.position).toBe(5);
  });

  it("is a no-op when items array is empty", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload: { items: [] },
    });
    expect(res.statusCode).toBe(200);
  });

  it("accepts negative/float position (schema allows it)", async () => {
    const payload = { items: [{ id: listIds[0], position: -3.5 }] };
    await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });
    const a = await KnowledgeListModel.findById(listIds[0], null, {
      skipTenant: true,
    });
    expect(a?.position).toBe(-3.5);
  });

  it("respects exact given positions (no renumbering/compaction)", async () => {
    const payload = { items: [{ id: listIds[1], position: 99 }] };
    await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });
    const b = await KnowledgeListModel.findById(listIds[1], null, {
      skipTenant: true,
    });
    expect(b?.position).toBe(99);
  });
});

describe("PUT /api/projects/:projectId/lists/reorder isolation", () => {
  it("ignores bogus/nonexistent item id without error", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const payload = { items: [{ id: fakeId, position: 1 }] };
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });
    expect(res.statusCode).toBe(200);
  });

  it("ignores cross-project id due to explicit filter", async () => {
    // Try to move otherProjectListId in the context of pId
    const payload = { items: [{ id: otherProjectListId, position: 9 }] };
    await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });

    // Should remain 0
    const ol = await KnowledgeListModel.findById(otherProjectListId, null, {
      skipTenant: true,
    });
    expect(ol?.position).toBe(0);
  });

  it("ignores cross-tenant id due to explicit filter", async () => {
    // User-1 tries to move User-2's list
    const payload = { items: [{ id: otherTenantListId, position: 9 }] };
    await app.inject({
      method: "PUT",
      url: `/api/projects/${pId}/lists/reorder`,
      payload,
    });

    const ul = await KnowledgeListModel.findById(otherTenantListId, null, {
      skipTenant: true,
    });
    expect(ul?.position).toBe(0); // remains unchanged
  });

  it("allows tenant isolation full flow (user-2 reorders own)", async () => {
    // Get user-2's project id from the list
    const ul = await KnowledgeListModel.findById(otherTenantListId, null, {
      skipTenant: true,
    });

    const payload = { items: [{ id: otherTenantListId, position: 5 }] };
    const res = await app.inject({
      method: "PUT",
      url: `/api/projects/${ul?.projectId}/lists/reorder`,
      payload,
      headers: { "x-test-owner": "test-user-2" },
    });

    expect(res.statusCode).toBe(200);
    const verify = await KnowledgeListModel.findById(otherTenantListId, null, {
      skipTenant: true,
    });
    expect(verify?.position).toBe(5);
  });
});
