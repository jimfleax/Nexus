import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import { projectRoutes } from "../src/routes/projects.js";
import { ProjectModel } from "../src/models/Project.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

describe("Project Routes", () => {
  let app: any;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Mock deleter plugin
    app.decorate("deleter", {
      deleteProject: async (projectId: string, ownerId: string) => {
        await ProjectModel.findByIdAndDelete(projectId, { skipTenant: true });
      },
    });

    await ProjectModel.init();

    // Mock tenant context
    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = "user-1";
      tenantContext.run({ ownerId: "user-1" }, () => done());
    });

    app.register(projectRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("POST /api/projects should create a new project", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        name: "Test Project",
        description: "A test project",
        color: "#ffffff",
      },
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Test Project");
    expect(data.slug).toBe("test-project");
  });

  it("POST /api/projects should return 409 for duplicate project name", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        name: "Test Project",
        description: "Another one",
        color: "#000000",
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("GET /api/projects should list all projects", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/projects",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toBe("Test Project");
  });

  it("GET /api/projects/:id should return project details", async () => {
    const projects = await ProjectModel.find({}, null, { skipTenant: true });
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projects[0].id}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Test Project");
  });

  it("PATCH /api/projects/:id should update a project", async () => {
    const projects = await ProjectModel.find({}, null, { skipTenant: true });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projects[0].id}`,
      payload: {
        name: "Updated Project",
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.name).toBe("Updated Project");
    expect(data.slug).toBe("updated-project");
  });

  it("DELETE /api/projects/:id should delete a project", async () => {
    const projects = await ProjectModel.find({}, null, { skipTenant: true });
    const response = await app.inject({
      method: "DELETE",
      url: `/api/projects/${projects[0].id}`,
    });

    expect(response.statusCode).toBe(204);

    const check = await ProjectModel.findById(projects[0].id, null, {
      skipTenant: true,
    });
    expect(check).toBeNull();
  });
});
