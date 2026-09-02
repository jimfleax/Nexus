import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { userRoutes } from "../src/routes/user.js";
import { tenantContext, connectDB } from "../src/db.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    const ownerId = request.headers["x-test-owner"] || "test-user-1";
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.register(userRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // UserModel has no tenant plugin, simple deleteMany works
  await UserModel.deleteMany({});
});

describe("GET /api/user/settings", () => {
  it("auto-creates user on first visit if none exists", async () => {
    const res = await app.inject({ method: "GET", url: "/api/user/settings" });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBeUndefined();

    const count = await UserModel.countDocuments({ ownerId: "test-user-1" });
    expect(count).toBe(1);
  });

  it("returns existing token if user exists", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-1",
    });
    const res = await app.inject({ method: "GET", url: "/api/user/settings" });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBe("tok-1");
  });

  it("is idempotent (doesn't duplicate users on multiple calls)", async () => {
    await app.inject({ method: "GET", url: "/api/user/settings" });
    await app.inject({ method: "GET", url: "/api/user/settings" });
    const count = await UserModel.countDocuments({ ownerId: "test-user-1" });
    expect(count).toBe(1); // Still exactly 1
  });

  it("is tenant-scoped based on request owner", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-1",
    });
    await UserModel.create({
      ownerId: "test-user-2",
      driveRefreshToken: "tok-2",
    });

    const res1 = await app.inject({
      method: "GET",
      url: "/api/user/settings",
      headers: { "x-test-owner": "test-user-1" },
    });
    const res2 = await app.inject({
      method: "GET",
      url: "/api/user/settings",
      headers: { "x-test-owner": "test-user-2" },
    });

    expect(res1.json().driveRefreshToken).toBe("tok-1");
    expect(res2.json().driveRefreshToken).toBe("tok-2");
  });
});

describe("PATCH /api/user/settings", () => {
  it("creates user when none exists and sets token", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: { driveRefreshToken: "tok-new" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBe("tok-new");

    const doc = await UserModel.findOne({ ownerId: "test-user-1" });
    expect(doc?.driveRefreshToken).toBe("tok-new");
  });

  it("updates existing user's token", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-old",
    });
    const res = await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: { driveRefreshToken: "tok-new" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBe("tok-new");
    const doc = await UserModel.findOne({ ownerId: "test-user-1" });
    expect(doc?.driveRefreshToken).toBe("tok-new");
  });

  it("leaves token unchanged if PATCH body is empty", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-old",
    });
    const res = await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBe("tok-old");
  });

  it("replaces token if PATCH provides null", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-old",
    });
    const res = await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: { driveRefreshToken: null },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().driveRefreshToken).toBeNull();
  });

  it("isolates PATCH mutations to the requesting user", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok-1",
    });
    await UserModel.create({
      ownerId: "test-user-2",
      driveRefreshToken: "tok-2",
    });

    await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: { driveRefreshToken: "tok-2-new" },
      headers: { "x-test-owner": "test-user-2" },
    });

    const doc1 = await UserModel.findOne({ ownerId: "test-user-1" });
    const doc2 = await UserModel.findOne({ ownerId: "test-user-2" });
    expect(doc1?.driveRefreshToken).toBe("tok-1"); // unchanged
    expect(doc2?.driveRefreshToken).toBe("tok-2-new"); // changed
  });

  it("returns 400 for invalid body types", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/user/settings",
      payload: { driveRefreshToken: 123 },
    });
    expect(res.statusCode).toBe(400); // Zod rejection
  });
});
