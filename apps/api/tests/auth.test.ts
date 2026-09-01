import { describe, it, expect } from "vitest";
import { verifyToken } from "../src/auth";
import { SignJWT } from "jose";
import { hkdf } from "node:crypto";
import { promisify } from "node:util";
import { EncryptJWT } from "jose";

const hkdfAsync = promisify(hkdf);

async function getNextAuthKey(secret: string) {
  const salt = "authjs.session-token";
  const buffer = await hkdfAsync(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64,
  );
  return new Uint8Array(buffer);
}

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

  it("should verify NextAuth JWE tokens", async () => {
    const key = await getNextAuthKey(secret);

    const token = await new EncryptJWT({ sub: "user-456" })
      .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
      .encrypt(key);

    const payload = await verifyToken(token, secret);
    expect(payload.sub).toBe("user-456");
  });

  it("should throw for invalid tokens", async () => {
    await expect(verifyToken("invalid-token", secret)).rejects.toThrow();
  });
});
