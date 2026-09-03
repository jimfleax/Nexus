import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import { UserModel } from "../src/models/User.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { integrationRoutes } from "../src/routes/integrations.js";

import { vi } from "vitest";

let mongoServer: MongoMemoryServer;
let app: any;
const ownerId = "test-owner-1";
const revokeConnection = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.API_URL = "http://localhost:8080";

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const { default: cookiePlugin } = await import("@fastify/cookie");
  const { oauthProviderPlugin } =
    await import("../src/plugins/oauthProvider.js");

  app.register(cookiePlugin);
  app.register(oauthProviderPlugin);

  // Mock the authenticated tenant the same way helpers.createTestApp does.
  app.decorateRequest("ownerId", "");
  app.addHook("onRequest", (request: any, _reply: any, done: any) => {
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.register(integrationRoutes);
  await app.ready();

  app.oauth.registerProvider("google", {
    getAuthorizationUrl() {
      return "https://accounts.google.com/o/oauth2/v2/auth?mock=1";
    },
    async exchangeCode() {
      return { accessToken: "mock-access-token", refreshToken: "mock-refresh" };
    },
    async getIdentity() {
      return {
        id: "google_mock-id",
        email: "mock@example.com",
        name: "Mock User",
        image: "http://example.com/pic.jpg",
      };
    },
    buildAuthedClient() {
      return { revokeToken: vi.fn() };
    },
    revokeConnection,
  });
});

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  revokeConnection.mockClear();
  await UserModel.deleteMany({}, { skipTenant: true });
});

describe("integrationRoutes boot & disconnect", () => {
  it("boots with a single disconnect route and no duplicate-route error", async () => {
    const tree = app.printRoutes() as string;
    const disconnectLines = tree
      .split("\n")
      .filter((l) => l.includes("disconnect"));
    expect(disconnectLines).toHaveLength(1);
  });

  it("returns success when disconnecting a user with no Drive token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/integrations/google-drive/disconnect",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });

  it("clears a stored Drive refresh token on disconnect", async () => {
    await UserModel.create({ ownerId, driveRefreshToken: "stored-token" });

    const res = await app.inject({
      method: "POST",
      url: "/api/integrations/google-drive/disconnect",
    });
    expect(res.statusCode).toBe(200);

    const user = await UserModel.findOne({ ownerId });
    expect(user?.driveRefreshToken).toBeUndefined();
  });

  it("delegates token revocation to the provider when a Drive token is stored", async () => {
    await UserModel.create({ ownerId, driveRefreshToken: "stored-token" });

    await app.inject({
      method: "POST",
      url: "/api/integrations/google-drive/disconnect",
    });

    expect(revokeConnection).toHaveBeenCalledTimes(1);
    expect(revokeConnection).toHaveBeenCalledWith("stored-token");
  });

  it("does not revoke when the user has no Drive token", async () => {
    await app.inject({
      method: "POST",
      url: "/api/integrations/google-drive/disconnect",
    });

    expect(revokeConnection).not.toHaveBeenCalled();
  });
});
