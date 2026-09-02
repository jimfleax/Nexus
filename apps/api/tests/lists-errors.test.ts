import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
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
let p2Id: string;
let lAId: string;
let lBId: string;

const deleteList = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
  await KnowledgeListModel.init();

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const { errorHandlerPlugin } = await import("../src/plugins/errorHandler.js");
  app.register(errorHandlerPlugin);

  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    const ownerId = request.headers["x-test-owner"] || "test-user-1";
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.decorate("deleter", {
    deleteList,
    deleteProject: vi.fn(),
    deleteResource: vi.fn(),
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
  deleteList.mockClear();

  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ProjectModel.deleteMany({}, { skipTenant: true });
    await KnowledgeListModel.deleteMany({}, { skipTenant: true });

    const p = await ProjectModel.create({ name: "Proj", slug: "proj" });
    pId = p._id.toString();

    const p2 = await ProjectModel.create({ name: "Proj2", slug: "proj2" });
    p2Id = p2._id.toString();

    const a = await KnowledgeListModel.create({
      projectId: pId,
      name: "A",
      slug: "a",
      position: 0,
    });
    lAId = a._id.toString();

    const b = await KnowledgeListModel.create({
      projectId: pId,
      name: "B",
      slug: "b",
      position: 1,
    });
    lBId = b._id.toString();
  });
});

describe("GET and POST List routes", () => {
  it("returns single list by id", async () => {
    const res = await app.inject({ method: "GET", url: `/api/lists/${lAId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: lAId,
      name: "A",
      slug: "a",
      position: 0,
    });
  });

  it("returns 404 for nonexistent list GET", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/lists/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("isolates tenant for GET single list", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/lists/${lAId}`,
      headers: { "x-test-owner": "test-user-2" }, // wrong tenant
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns lists sorted by position for project", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${pId}/lists`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(2);
    expect(data[0].position).toBe(0);
    expect(data[1].position).toBe(1);
  });

  it("returns 404 POSTing list to nonexistent project", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${fakeId}/lists`,
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 409 POSTing duplicate name to same project", async () => {
    // "B" exists in pId
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${pId}/lists`,
      payload: { name: "B" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("allows same name in DIFFERENT project", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${p2Id}/lists`,
      payload: { name: "B" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("appends to end of existing positions", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${pId}/lists`,
      payload: { name: "C" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().position).toBe(2); // after 0 and 1
  });

  it("starts at position 0 for empty project", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${p2Id}/lists`,
      payload: { name: "Solo" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().position).toBe(0);
  });
});

describe("PATCH and DELETE List routes", () => {
  it("returns 404 PATCHing nonexistent id", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/lists/${fakeId}`,
      payload: { name: "Z" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("regenerates slug on rename", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/lists/${lAId}`,
      payload: { name: "A Renamed" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("A Renamed");
    expect(res.json().slug).toBe("a-renamed");
  });

  it("returns 409 when rename collides with existing slug", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/lists/${lAId}`,
      payload: { name: " B " },
    }); // slug "b"
    expect(res.statusCode).toBe(409);
  });

  it("keeps slug unchanged when patching only description", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/lists/${lAId}`,
      payload: { description: "hi" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().slug).toBe("a"); // unchanged
  });

  it("returns 404 and does not call deleter for nonexistent DELETE", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/lists/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
    expect(deleteList).not.toHaveBeenCalled();
  });

  it("calls deleter on successful DELETE", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/lists/${lAId}`,
    });
    expect(res.statusCode).toBe(204);
    expect(deleteList).toHaveBeenCalledWith(lAId, "test-user-1");
  });
});
