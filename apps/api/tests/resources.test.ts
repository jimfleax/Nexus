import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

describe("Resources Routes (CRUD)", () => {
  let app: any;
  let mongoServer: MongoMemoryServer;
  let resourceId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorate("deleter", {
      deleteResource: async (resId: string, ownerId: string) => {
        await ResourceModel.findByIdAndDelete(resId, { skipTenant: true });
      },
    });

    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = "user-1";
      tenantContext.run({ ownerId: "user-1" }, () => done());
    });

    app.register(resourceRoutes);
    await app.ready();

    // Create a dummy resource
    const res = await tenantContext.run({ ownerId: "user-1" }, async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Test Note",
        type: "note",
        content: "Hello world",
        ownerId: "user-1",
      });
    });
    resourceId = res.id;
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("GET /api/resources/:id should return a resource", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/resources/${resourceId}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.title).toBe("Test Note");
    expect(data.type).toBe("note");
    // lastOpenedAt should be updated
  });

  it("PATCH /api/resources/:id should update resource details", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/api/resources/${resourceId}`,
      payload: {
        title: "Updated Note",
        isFavorite: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.title).toBe("Updated Note");
    expect(data.isFavorite).toBe(true);
  });

  it("PATCH /api/resources/:id should update resource listId", async () => {
    // Create a dummy list first
    const list2 = await tenantContext.run({ ownerId: "user-1" }, async () => {
      return await mongoose.model("KnowledgeList").create({
        projectId: "p1",
        name: "List 2",
        slug: "list-2",
        ownerId: "user-1",
        position: 1,
      });
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/resources/${resourceId}`,
      payload: {
        listId: list2.id,
      },
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.listId).toBe(list2.id);
  });

  it("DELETE /api/resources/:id should delete the resource", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/resources/${resourceId}`,
    });

    expect(response.statusCode).toBe(204);

    const check = await ResourceModel.findById(resourceId, null, {
      skipTenant: true,
    });
    expect(check).toBeNull();
  });
});
