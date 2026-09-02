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
import { projectRoutes } from "../src/routes/projects.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
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
let otherTenantProjectId: string;
let secondProjectId: string;

const deleteProject = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
  await ProjectModel.init(); // Ensure indexes

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
    deleteProject,
    deleteList: vi.fn(),
    deleteResource: vi.fn(),
  });
  app.register(projectRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  deleteProject.mockClear();

  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ProjectModel.deleteMany({}, { skipTenant: true });

    const p1 = await ProjectModel.create({ name: "Proj", slug: "proj" });
    pId = p1._id.toString();

    const p2 = await ProjectModel.create({ name: "Other", slug: "other" });
    secondProjectId = p2._id.toString();
  });

  await tenantContext.run({ ownerId: "test-user-2" }, async () => {
    const p3 = await ProjectModel.create({
      name: "User2 Proj",
      slug: "user2-proj",
    });
    otherTenantProjectId = p3._id.toString();
  });
});

describe("GET and DELETE error paths and isolation", () => {
  it("returns 404 for nonexistent project GET", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 and doesn't call deleter for nonexistent DELETE", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/projects/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it("returns 204 and calls deleter on happy DELETE", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/projects/${pId}`,
    });
    expect(res.statusCode).toBe(204);
    expect(deleteProject).toHaveBeenCalledWith(pId, "test-user-1");
  });

  it("returns 404 GETting another tenant's project", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${pId}`,
      headers: { "x-test-owner": "test-user-2" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 and skips deleter when DELETEing another tenant's project", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/projects/${pId}`,
      headers: { "x-test-owner": "test-user-2" },
    });
    expect(res.statusCode).toBe(404);
    expect(deleteProject).not.toHaveBeenCalled();
  });
});

describe("PATCH error paths and renaming", () => {
  it("returns 404 for nonexistent project PATCH", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/projects/${fakeId}`,
      payload: { name: "X" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("regenerates slug on rename", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/projects/${pId}`,
      payload: { name: "Proj Renamed" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().slug).toBe("proj-renamed");
  });

  it("returns 409 when rename collides with existing slug", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/projects/${pId}`,
      payload: { name: "Other" },
    }); // slug "other" exists
    expect(res.statusCode).toBe(409);
    expect(res.json().ok).toBe(false);
    expect(res.json().error.code).toBe("CONFLICT_ERROR");
  });

  it("keeps slug unchanged when patching description only", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/projects/${pId}`,
      payload: { description: "desc" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().slug).toBe("proj"); // unchanged
  });
});

describe("POST slugification, validation and collisions", () => {
  it("slugifies spaced and punctuated names", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: " Project A " },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().slug).toBe("project-a");
  });

  it("returns 400 for empty name", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "" },
    });
    expect(res.statusCode).toBe(400); // Zod min(1)
  });

  it("returns 400 for name exceeding length limit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "x".repeat(101) },
    });
    expect(res.statusCode).toBe(400); // Zod max(100)
  });

  it("returns 400 for name that produces empty slug (Mongoose validation caught)", async () => {
    // "!!!" slugifies to "" which fails Mongoose schema minLength validation
    // The global error handler now correctly surfaces this as 400, not 500
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "!!!" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().ok).toBe(false);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 POSTing duplicate name in same tenant", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Other" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("allows same name in DIFFERENT tenant", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Other" },
      headers: { "x-test-owner": "test-user-2" },
    });
    expect(res.statusCode).toBe(201);
  });
});
