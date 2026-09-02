import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildOAuthClient } from "../src/utils/google/oauth.js";

describe("buildOAuthClient", () => {
  let origId: string | undefined;
  let origSecret: string | undefined;

  beforeEach(() => {
    origId = process.env.AUTH_GOOGLE_ID;
    origSecret = process.env.AUTH_GOOGLE_SECRET;
  });

  afterEach(() => {
    process.env.AUTH_GOOGLE_ID = origId;
    process.env.AUTH_GOOGLE_SECRET = origSecret;
  });

  it("should throw if AUTH_GOOGLE_ID is missing", () => {
    delete process.env.AUTH_GOOGLE_ID;
    process.env.AUTH_GOOGLE_SECRET = "secret";
    expect(() => buildOAuthClient("token")).toThrow(
      "Google Auth not configured",
    );
  });

  it("should throw if AUTH_GOOGLE_SECRET is missing", () => {
    process.env.AUTH_GOOGLE_ID = "id";
    delete process.env.AUTH_GOOGLE_SECRET;
    expect(() => buildOAuthClient("token")).toThrow(
      "Google Auth not configured",
    );
  });

  it("should build and return client with credentials", () => {
    process.env.AUTH_GOOGLE_ID = "id";
    process.env.AUTH_GOOGLE_SECRET = "secret";
    const client = buildOAuthClient("my-token");
    expect(client).toBeDefined();
    expect(client.credentials.refresh_token).toBe("my-token");
  });
});
