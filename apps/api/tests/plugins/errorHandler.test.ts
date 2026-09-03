import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { errorHandlerPlugin } from "../../src/plugins/errorHandler.js";
import { NotFoundError, ApplicationError } from "../../src/utils/errors.js";
import { TokenRevokedError } from "../../src/utils/storage/types.js";
import { UserModel } from "../../src/models/User.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDB } from "../../src/db.js";
import mongoose from "mongoose";

describe("errorHandlerPlugin", () => {
  let app: any;
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
    app = Fastify({ logger: false });

    // Silence the fastify logger so tests don't get noisy
    app.log.error = () => {};
    app.log.warn = () => {};

    app.register(errorHandlerPlugin);

    // 1. Zod / Fastify Validation Errors simulation
    app.get("/test/validation", async () => {
      const err = new Error("Validation Error");
      (err as any).code = "FST_ERR_VALIDATION";
      (err as any).validation = [{ field: "name", message: "Required" }];
      throw err;
    });

    // 2. Mongoose Duplicate Key Error simulation
    app.get("/test/duplicate", async () => {
      const err = new Error("Duplicate key");
      (err as any).code = 11000;
      (err as any).keyValue = { slug: "test-slug" };
      throw err;
    });

    // 3. Mongoose Cast Error simulation
    app.get("/test/cast", async () => {
      const err = new Error("Cast to ObjectId failed");
      err.name = "CastError";
      throw err;
    });

    // 4. Mongoose ValidationError simulation
    app.get("/test/mongoose-validation", async () => {
      const err = new Error("Validation failed");
      err.name = "ValidationError";
      (err as any).errors = { name: { message: "Path `name` is required" } };
      throw err;
    });

    // 5. Custom ApplicationError simulation
    app.get("/test/not-found", async () => {
      throw new NotFoundError("Project", "123");
    });

    // 6. Fallback unhandled error simulation
    app.get("/test/unhandled", async () => {
      throw new Error("Something broke!");
    });

    // 7. TokenRevokedError simulation
    app.get("/test/token-revoked", async () => {
      throw new TokenRevokedError("Google Drive token revoked", "user-456");
    });

    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
  });

  it("should format Zod/Fastify validation errors as 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test/validation",
    });
    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(data.error.details).toEqual([
      { field: "name", message: "Required" },
    ]);
  });

  it("should format Mongoose Duplicate Key errors as 409 CONFLICT_ERROR", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test/duplicate",
    });
    expect(response.statusCode).toBe(409);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("CONFLICT_ERROR");
    expect(data.error.details).toEqual({ slug: "test-slug" });
  });

  it("should format Mongoose CastError as 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({ method: "GET", url: "/test/cast" });
    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should format Mongoose ValidationError as 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test/mongoose-validation",
    });
    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(data.error.details).toEqual({
      name: { message: "Path `name` is required" },
    });
  });

  it("should pass through known ApplicationError subclasses preserving statusCode", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test/not-found",
    });
    expect(response.statusCode).toBe(404);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(data.error.message).toBe("Project not found");
    expect(data.error.details).toEqual({ id: "123" });
  });

  it("should catch unhandled generic errors and return 500 INTERNAL_ERROR", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test/unhandled",
    });
    expect(response.statusCode).toBe(500);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });

  it("should catch TokenRevokedError, clear token from DB, and return 401 INTEGRATION_ERROR", async () => {
    // Setup a dummy user with a token
    await UserModel.create({
      ownerId: "user-456",
      driveRefreshToken: "valid-token",
    });

    const response = await app.inject({
      method: "GET",
      url: "/test/token-revoked",
    });

    expect(response.statusCode).toBe(401);
    const data = JSON.parse(response.payload);
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("INTEGRATION_ERROR");

    // Verify token was cleared
    const user = await UserModel.findOne({ ownerId: "user-456" });
    expect(user).toBeDefined();
    expect(user!.driveRefreshToken).toBeUndefined();

    // Clean up
    await UserModel.deleteOne({ ownerId: "user-456" });
  });
});
