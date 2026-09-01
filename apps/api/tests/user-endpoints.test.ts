import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { connectDB } from "../src/db.js";
import { userRoutes } from "../src/routes/user.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import { tenantContext } from "../src/db.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import { deletionPlugin } from "../src/plugins/deletion.js";

let mongoServer: MongoMemoryServer;
let app: any;

describe("User Endpoints", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.decorateRequest("ownerId", null);
    app.register(storagePlugin, { adapter: new FakeStorageAdapter() });
    app.register(deletionPlugin);

    // Setup tenant context for each request
    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      // Mock the auth middleware by setting ownerId directly
      request.ownerId = "test-user-1";
      tenantContext.run({ ownerId: "test-user-1" }, () => {
        done();
      });
    });

    app.register(userRoutes);
    app.register(resourceRoutes);

    await app.ready();

    // Setup some data for user-1
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-1" }, async () => {
        await ResourceModel.create([
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Fav 1",
            type: "note",
            isFavorite: true,
          },
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Not Fav 1",
            type: "note",
            isFavorite: false,
          },
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Fav 2",
            type: "note",
            isFavorite: true,
          },
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Recent 1",
            type: "note",
            lastOpenedAt: new Date(Date.now() - 1000),
          },
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Recent 2",
            type: "note",
            lastOpenedAt: new Date(Date.now() - 5000),
          },
        ]);
        resolve();
      }),
    );

    // Other user's data
    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-2" }, async () => {
        await ResourceModel.create([
          {
            projectId: "proj-1",
            listId: "list-1",
            title: "Fav User 2",
            type: "note",
            isFavorite: true,
          },
        ]);
        resolve();
      }),
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("GET /api/user/favorites returns only favorite resources for the user", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/user/favorites",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(2);
    expect(data.map((r: any) => r.title)).toContain("Fav 1");
    expect(data.map((r: any) => r.title)).toContain("Fav 2");
  });

  it("GET /api/user/recent returns recently opened resources", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/user/recent",
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.length).toBe(5);
    expect(data[0].title).toBe("Recent 1");
    expect(data[1].title).toBe("Recent 2");
  });
});
