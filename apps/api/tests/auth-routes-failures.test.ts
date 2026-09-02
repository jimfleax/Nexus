import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  afterEach,
} from "vitest";
import Fastify from "fastify";
import { authRoutes } from "../src/routes/auth.js";
import { authPlugin } from "../src/auth.js";
import { connectDB } from "../src/db.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

const originalFetch = global.fetch;
let fetchMock = vi.fn();
global.fetch = fetchMock as any;

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
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
  vi.stubEnv("AUTH_GITHUB_ID", "github-id");
  vi.stubEnv("AUTH_GITHUB_SECRET", "github-secret");
  vi.stubEnv("FRONTEND_URL", "http://localhost:3000");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// Helper for standard happy mock
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

const setupHappyGithubMock = () => {
  fetchMock.mockImplementation(async (url: any) => {
    const urlStr = url.toString();
    if (urlStr.includes("access_token"))
      return { ok: true, json: async () => ({ access_token: "at" }) };
    if (urlStr.includes("user/emails"))
      return {
        ok: true,
        json: async () => [
          { email: "gh@example.com", primary: true, verified: true },
        ],
      };
    if (urlStr.includes("user"))
      return { ok: true, json: async () => ({ id: 123, login: "ghuser" }) };
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

  it("returns 500 when GitHub unconfigured", async () => {
    vi.stubEnv("AUTH_GITHUB_ID", ""); // Unset
    const res = await app.inject({ method: "GET", url: "/api/auth/github" });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("GitHub OAuth not configured");
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

  it("redirects auth_failed when GitHub token json has error or missing access_token", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "bad" }),
    });
    const res1 = await app.inject({
      method: "GET",
      url: "/api/auth/callback/github?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res1.statusCode).toBe(302);
    expect(res1.headers.location).toContain("auth_failed");

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // no token
    const res2 = await app.inject({
      method: "GET",
      url: "/api/auth/callback/github?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res2.headers.location).toContain("auth_failed");
  });

  it("GitHub email fallback failure is non-fatal", async () => {
    fetchMock.mockImplementation(async (url: any) => {
      const u = url.toString();
      if (u.includes("access_token"))
        return { ok: true, json: async () => ({ access_token: "at" }) };
      if (u.includes("user/emails"))
        return { ok: false, text: async () => "fail" }; // Emails fail
      if (u.includes("user"))
        return { ok: true, json: async () => ({ id: 123, login: "ghuser" }) }; // user success
      return { ok: false };
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/callback/github?code=x&state=v",
      headers: { cookie: "oauth_state=v" },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("sync?token="); // Success despite email fetch failure

    // Verify user upserted with null email
    const user = await UserModel.findOne({ ownerId: "github_123" }, null, {
      skipTenant: true,
    });
    expect(user).toBeTruthy();
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
