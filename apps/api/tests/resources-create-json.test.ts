import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { resourceRoutes } from "../src/routes/resources.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ResourceModel } from "../src/models/Resource.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import multipart from "@fastify/multipart";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;
let testProject: string;
let testList: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    request.ownerId = "test-user-1";
    tenantContext.run({ ownerId: "test-user-1" }, () => done());
  });

  app.register(multipart);
  app.register(resourceRoutes);
  await app.ready();

  await new Promise<void>((resolve) =>
    tenantContext.run({ ownerId: "test-user-1" }, async () => {
      const project = await ProjectModel.create({ name: "Proj", slug: "proj" });
      const list = await KnowledgeListModel.create({
        projectId: project.id,
        name: "L1",
        slug: "l1",
        position: 0,
      });
      testProject = project._id.toString();
      testList = list._id.toString();
      resolve();
    }),
  );
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ResourceModel.deleteMany({});
  });
});

describe("Valid resource creation", () => {
  it("creates a note resource", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "Note",
      type: "note",
      content: "hello",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      status: "ready",
      tags: [],
      isFavorite: false,
      type: "note",
    });
  });

  it("creates a url resource", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "Link",
      type: "url",
      url: "https://example.com",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().url).toBe("https://example.com");
  });

  it("creates a markdown resource", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "MD",
      type: "markdown",
      content: "# hi",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().content).toBe("# hi");
  });

  it("honors tags and isFavorite", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "T",
      type: "note",
      tags: ["a", "b"],
      isFavorite: true,
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ tags: ["a", "b"], isFavorite: true });
  });
});

describe("Validation and uniqueness", () => {
  it("rejects pdf without file stream (JSON branch)", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "PDF",
      type: "pdf",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(
      "File stream required for this resource type",
    );
  });

  it("rejects duplicate title in same project", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "Doc",
      type: "note",
    };
    await app.inject({ method: "POST", url: "/api/resources", payload });
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(
      "A resource with this name already exists in the project",
    );
  });

  it("allows same title in different project", async () => {
    let p2Id: string = "";
    let l2Id: string = "";
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-1" }, async () => {
        const p2 = await ProjectModel.create({ name: "Proj2", slug: "proj2" });
        const l2 = await KnowledgeListModel.create({
          projectId: p2.id,
          name: "L2",
          slug: "l2",
          position: 0,
        });
        p2Id = p2.id;
        l2Id = l2.id;
        resolve();
      }),
    );

    const payload1 = {
      projectId: testProject,
      listId: testList,
      title: "Doc",
      type: "note",
    };
    const payload2 = {
      projectId: p2Id,
      listId: l2Id,
      title: "Doc",
      type: "note",
    };

    const res1 = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload: payload1,
    });
    const res2 = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload: payload2,
    });

    expect(res1.statusCode).toBe(201);
    expect(res2.statusCode).toBe(201);
  });
});

describe("Schema and relations", () => {
  it("rejects list not in project", async () => {
    let otherProject: string = "";
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-1" }, async () => {
        const p = await ProjectModel.create({ name: "O", slug: "o" });
        otherProject = p.id;
        resolve();
      }),
    );
    const payload = {
      projectId: otherProject,
      listId: testList,
      title: "T",
      type: "note",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe(
      "Knowledge List not found in the specified project",
    );
  });

  it("rejects nonexistent list", async () => {
    const fakeList = new mongoose.Types.ObjectId().toHexString();
    const payload = {
      projectId: testProject,
      listId: fakeList,
      title: "T",
      type: "note",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects missing title", async () => {
    const payload = { projectId: testProject, listId: testList, type: "note" };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Invalid payload");
  });

  it("rejects empty title", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "",
      type: "note",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Title is required");
  });

  it("rejects invalid type", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "T",
      type: "video",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Invalid payload");
  });

  it("rejects invalid URL", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "T",
      type: "url",
      url: "not-a-url",
    };
    const res = await app.inject({
      method: "POST",
      url: "/api/resources",
      payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("Invalid payload");
  });
});

describe("Isolation and persistence", () => {
  it("persists to DB with correct ownerId and enforces isolation", async () => {
    const payload = {
      projectId: testProject,
      listId: testList,
      title: "ISO",
      type: "note",
    };
    await app.inject({ method: "POST", url: "/api/resources", payload });

    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-1" }, async () => {
        const found = await ResourceModel.findOne({ title: "ISO" });
        expect(found?.ownerId).toBe("test-user-1");
        resolve();
      }),
    );

    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-2" }, async () => {
        const found = await ResourceModel.findOne({ title: "ISO" });
        expect(found).toBeNull();
        resolve();
      }),
    );
  });
});
