import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { infoRoutes } from "../src/routes/info.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import mongoose from "mongoose";

describe("Info Routes", () => {
  let app: any;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.register(infoRoutes);

    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = "user-1";
      tenantContext.run({ ownerId: "user-1" }, () => done());
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("GET /api/info should return 400 without query params", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/info",
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /api/info should return 404 for non-existent project", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/info?type=project&id=64d39f60c4f8d21234567890",
    });

    expect(response.statusCode).toBe(404);
  });
});
