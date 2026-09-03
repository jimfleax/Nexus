import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { encrypt, decrypt } from "../src/utils/crypto";

describe("crypto util", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should successfully encrypt and decrypt text", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-secret-key-that-is-long-enough";
    const text = "my-secret-token";

    const encrypted = encrypt(text);
    expect(encrypted).not.toBe(text);
    expect(encrypted).toBeDefined();

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(text);
  });

  it("should fail to decrypt with different key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-secret-key-1";
    const text = "my-secret-token";
    const encrypted = encrypt(text);

    process.env.TOKEN_ENCRYPTION_KEY = "test-secret-key-2";
    expect(() => decrypt(encrypted)).toThrow();
  });

  it("should throw if TOKEN_ENCRYPTION_KEY is not defined", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;

    expect(() => encrypt("text")).toThrow(
      "TOKEN_ENCRYPTION_KEY must be defined",
    );
    expect(() => decrypt("encData")).toThrow(
      "TOKEN_ENCRYPTION_KEY must be defined",
    );
  });
});
