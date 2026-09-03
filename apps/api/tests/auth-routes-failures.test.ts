import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import Fastify from "fastify";
import { authPlugin } from "../src/auth.js";
import { authRoutes } from "../src/routes/auth.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB } from "../src/db.js";

const fetchMock = vi.fn();
const originalFetch = global.fetch;

let mongoServer: MongoMemoryServer;
let app: any;

beforeAll(async () => {
  global.fetch = fetchMock;
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify();
  app.register(authPlugin);
  app.register(authRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
  global.fetch = originalFetch;
});

beforeEach(async () => {
  vi.restoreAllMocks();
  fetchMock.mockClear();
  await UserModel.deleteMany({}, { skipTenant: true });

  vi.stubEnv("AUTH_SECRET", "test-secret-12345678901234567890");
  vi.stubEnv("AUTH_GOOGLE_ID", "google-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "google-secret");
  vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const setupHappyGoogleMock = () => {
  fetchMock.mockImplementation(async (url: any) => {
    const urlStr = url.toString();
    if (urlStr.includes("token"))
      return { ok: true, json: async () => ({ access_token: "at" }) };
    if (urlStr.includes("userinfo"))
      return {
        ok: true,
        json: async () => ({ sub: "google-123", email: "g@example.com" }),
      };
    return { ok: false };
  });
};

describe("Initiate & callback validation failures", () => {
  it("returns 500 when Google unconfigured", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", ""); // Unset
    const res = await app.inject({ method: "GET", url: "/api/auth/google" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("Google OAuth not configured");
  });

  it("redirects auth_failed when callback missing code", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(
      "http://localhost:3000/signin?error=auth_failed",
    );
  });

  it("redirects auth_failed when callback has error param", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v&error=access_denied",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });

  it("redirects auth_failed on state mismatch", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=wrong",
      headers: { cookie: "oauth_state=right" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });

  it("redirects auth_failed on missing oauth_state cookie", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
    }); // No cookie
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });
});

describe("OAuth provider fetch failures", () => {
  it("redirects auth_failed on Google token exchange non-OK", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "err",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });

  it("redirects auth_failed on Google userinfo non-OK", async () => {
    fetchMock.mockImplementation(async (url: any) => {
      const u = url.toString();
      if (u.includes("token"))
        return { ok: true, json: async () => ({ access_token: "at" }) };
      return { ok: false, text: async () => "err" }; // userinfo fails
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });

  it("redirects auth_failed when upstream fetch throws network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");
  });
});

describe("Internal edge cases and state cleanup", () => {
  it("clears oauth_state cookie on success", async () => {
    setupHappyGoogleMock();
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    const setCookie = res.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookie)
      ? setCookie.join(";")
      : setCookie;
    expect(cookieStr).toContain("oauth_state=");
    expect(cookieStr).toContain("Max-Age=0");
  });

  it("fails if AUTH_SECRET is unset during callback (upserts user but auth fails)", async () => {
    setupHappyGoogleMock();
    vi.stubEnv("AUTH_SECRET", "");

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("auth_failed");

    // But user was upserted prior to sign throw!
    const user = await UserModel.findOne(
      { ownerId: "google_google-123" },
      null,
      { skipTenant: true },
    );
    expect(user).toBeTruthy();
  });

  it("swallows duplicate upsert user race gracefully", async () => {
    setupHappyGoogleMock();
    // Force UserModel.create to throw a duplicate key error (simulate race)
    vi.spyOn(UserModel, "create").mockRejectedValueOnce(
      Object.assign(new Error("E11000 duplicate"), { code: 11000 }),
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/google?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    // Should swallow and succeed, generating JWT
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("sync?token=");
  });
});
