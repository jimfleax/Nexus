import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import mongoose from "mongoose";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import { deletionPlugin } from "../src/plugins/deletion.js";
import { projectRoutes } from "../src/routes/projects.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";

let mongoServer: MongoMemoryServer;
let app: any;
const OWNER = "test-user-1";

describe("GET /api/projects – listCount", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorateRequest("ownerId", null);
    app.register(storagePlugin, { adapter: new FakeStorageAdapter() });
    app.register(deletionPlugin);

    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = OWNER;
      tenantContext.run({ ownerId: OWNER }, () => done());
    });

    app.register(projectRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await tenantContext.run({ ownerId: OWNER }, async () => {
      await ProjectModel.deleteMany({});
      await KnowledgeListModel.deleteMany({});
    });
  });

  it("returns listCount=0 for a project with no lists", async () => {
    await tenantContext.run({ ownerId: OWNER }, async () => {
      await ProjectModel.create({
        ownerId: OWNER,
        name: "Empty Project",
        slug: "empty-project",
      });
    });

    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const projects = JSON.parse(res.body);
    expect(projects).toHaveLength(1);
    expect(projects[0].listCount).toBe(0);
  });

  it("returns correct listCount per project", async () => {
    await tenantContext.run({ ownerId: OWNER }, async () => {
      const projectA = await ProjectModel.create({
        ownerId: OWNER,
        name: "Project A",
        slug: "project-a",
      });
      const projectB = await ProjectModel.create({
        ownerId: OWNER,
        name: "Project B",
        slug: "project-b",
      });

      // 3 lists under A, 1 under B
      for (let i = 0; i < 3; i++) {
        await KnowledgeListModel.create({
          ownerId: OWNER,
          projectId: String(projectA._id),
          name: `List A${i}`,
          slug: `list-a${i}`,
          position: i,
        });
      }
      await KnowledgeListModel.create({
        ownerId: OWNER,
        projectId: String(projectB._id),
        name: "List B0",
        slug: "list-b0",
        position: 0,
      });
    });

    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const projects: any[] = JSON.parse(res.body);
    expect(projects).toHaveLength(2);

    const a = projects.find((p) => p.name === "Project A");
    const b = projects.find((p) => p.name === "Project B");
    expect(a.listCount).toBe(3);
    expect(b.listCount).toBe(1);
  });
});
