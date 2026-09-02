import { describe, it, expect } from "vitest";
import { verifyToken } from "../src/auth";
import { SignJWT } from "jose";

describe("Auth Validation", () => {
  const secret = "test-secret-12345678901234567890";

  it("should verify standard JWS tokens", async () => {
    const key = new TextEncoder().encode(secret);
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(key);

    const payload = await verifyToken(token, secret);
    expect(payload.sub).toBe("user-123");
  });

  it("should throw for invalid tokens", async () => {
    await expect(verifyToken("invalid-token", secret)).rejects.toThrow();
  });
});
