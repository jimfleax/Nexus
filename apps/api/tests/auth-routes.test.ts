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
  process.env.AUTH_GITHUB_ID = "github-id";
  process.env.AUTH_GITHUB_SECRET = "github-secret";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.API_URL = "http://localhost:8080";

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(authRoutes);
  app.register(authPlugin);
  await app.ready();
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

  it("GET /api/auth/github should redirect and set state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/github",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain(
      "https://github.com/login/oauth/authorize",
    );
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
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: any) => {
      if (url.toString().includes("token")) {
        return {
          ok: true,
          json: async () => ({ access_token: "mock-access-token" }),
        };
      }
      if (url.toString().includes("userinfo")) {
        return {
          ok: true,
          json: async () => ({
            sub: "mock-google-id",
            email: "google@example.com",
            name: "Google User",
            picture: "http://example.com/pic.jpg",
          }),
        };
      }
      return originalFetch(url);
    });

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

    global.fetch = originalFetch;
  });

  it("GET /api/auth/callback/github with valid state and code should upsert user and return session", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: any) => {
      if (url.toString().includes("access_token")) {
        return {
          ok: true,
          json: async () => ({ access_token: "mock-github-token" }),
        };
      }
      if (url.toString().includes("api.github.com/user")) {
        if (url.toString().includes("/emails")) {
          return {
            ok: true,
            json: async () => [
              { email: "github@example.com", primary: true, verified: true },
            ],
          };
        }
        return {
          ok: true,
          json: async () => ({
            id: 12345,
            login: "githubuser",
            name: "Github User",
            avatar_url: "http://example.com/github.jpg",
          }),
        };
      }
      return originalFetch(url);
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/github?code=mock-code&state=valid-state",
      headers: {
        cookie: "oauth_state=valid-state",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("/api/auth/sync?token=");

    const user = await (UserModel as any)
      .findOne({ ownerId: "github_12345" })
      .setOptions({ skipTenant: true });
    expect(user).not.toBeNull();

    global.fetch = originalFetch;
  });
});
