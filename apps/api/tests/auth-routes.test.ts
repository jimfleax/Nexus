import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../src/auth.js";
import { authRoutes } from "../src/routes/auth.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB } from "../src/db.js";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  process.env.AUTH_SECRET = "test-secret-12345678901234567890";
  process.env.AUTH_GOOGLE_ID = "google-id";
  process.env.AUTH_GOOGLE_SECRET = "google-secret";
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
  app.register(authRoutes);
  app.register(authPlugin);
  await app.ready();

  app.oauth.registerProvider("google", {
    getAuthorizationUrl() {
      return "https://accounts.google.com/o/oauth2/v2/auth?mock=true";
    },
    async exchangeCode() {
      return { accessToken: "mock-access-token" };
    },
    async getIdentity() {
      return {
        id: "google_mock-google-id",
        email: "google@example.com",
        name: "Google User",
        image: "http://example.com/pic.jpg",
      };
    },
  });
});

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await UserModel.deleteMany({});
  vi.restoreAllMocks();
});

describe("Auth Routes", () => {
  it("GET /api/auth/google should redirect and set state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/google",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("https://accounts.google.com/");
    expect(res.headers["set-cookie"]).toBeDefined();

    const cookieHeader = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"].join(";")
      : res.headers["set-cookie"] || "";

    expect(cookieHeader).toContain("oauth_state=");
  });

  it("GET /api/auth/callback/google with invalid state should fail", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=123&state=invalid",
      headers: {
        cookie: "oauth_state=valid",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/signin?error=auth_failed");
  });

  it("GET /api/auth/callback/google with valid state and code should upsert user and return session", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=mock-code&state=valid-state",
      headers: {
        cookie: "oauth_state=valid-state",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/api/auth/sync?token=");

    const user = await (UserModel as any)
      .findOne({ ownerId: "google_mock-google-id" })
      .setOptions({ skipTenant: true });
    expect(user).not.toBeNull();
  });
});
