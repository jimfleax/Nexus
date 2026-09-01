import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import { searchRoutes } from "../src/routes/search.js";
import { ResourceModel } from "../src/models/Resource.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

describe("Search Routes", () => {
  let app: any;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = "user-1";
      tenantContext.run({ ownerId: "user-1" }, () => done());
    });

    app.register(searchRoutes);
    await ResourceModel.init();
    await app.ready();

    await new Promise<void>((resolve) => {
      tenantContext.run({ ownerId: "user-1" }, async () => {
        // Create some mock resources
        await ResourceModel.create({
          projectId: "p1",
          listId: "l1",
          title: "Unique Search Title",
          type: "pdf",
          ownerId: "user-1",
          isFavorite: true,
          lastOpenedAt: new Date(),
        });

        await ResourceModel.create({
          projectId: "p1",
          listId: "l1",
          title: "Another Resource",
          type: "markdown",
          ownerId: "user-1",
          isFavorite: false,
        });
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      tenantContext.run({ ownerId: "user-2" }, async () => {
        // Create an un-owned resource
        await ResourceModel.create({
          projectId: "p1",
          listId: "l1",
          title: "Hidden Unique Search Title",
          type: "pdf",
          ownerId: "user-2", // Different owner
          isFavorite: true,
        });
        resolve();
      });
    });
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("GET /api/search should return resources matching query", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/search?q=Unique",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1); // Should only return user-1's resource
    expect(data[0].title).toBe("Unique Search Title");
  });

  it("GET /api/search/suggestions should return titles matching regex", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/search/suggestions?q=another",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Another Resource");
  });

  it("GET /api/favorites should return favorited resources", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/favorites",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Unique Search Title");
    expect(data[0].isFavorite).toBe(true);
  });

  it("GET /api/recent should return resources sorted by lastOpenedAt", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/recent",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Unique Search Title");
  });
});
