import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GoogleOAuthProvider,
  buildGoogleAuthClient,
  authorizeWithGoogle,
} from "../src/utils/oauth/google.js";

describe("buildGoogleAuthClient", () => {
  it("builds an authenticated client with the given credentials", () => {
    const client = buildGoogleAuthClient("my-token", {
      clientId: "client-id",
      clientSecret: "client-secret",
    });
    expect(client.credentials.refresh_token).toBe("my-token");
    expect(client._clientId).toBe("client-id");
    expect(client._clientSecret).toBe("client-secret");
  });
});

describe("GoogleOAuthProvider.buildAuthedClient", () => {
  it("should build and return a client using the provider's credentials", () => {
    const provider = new GoogleOAuthProvider("client-id", "client-secret");
    const client = provider.buildAuthedClient("my-token");
    expect(client).toBeDefined();
    expect(client.credentials.refresh_token).toBe("my-token");
    expect(client._clientId).toBe("client-id");
    expect(client._clientSecret).toBe("client-secret");
  });
});

describe("GoogleOAuthProvider.revokeConnection", () => {
  it("revokes the token through the built authenticated client", async () => {
    const provider = new GoogleOAuthProvider("client-id", "client-secret");
    const revokeToken = vi.fn().mockResolvedValue(undefined);
    provider.buildAuthedClient = vi.fn().mockReturnValue({ revokeToken });

    await provider.revokeConnection("my-token");

    expect(provider.buildAuthedClient).toHaveBeenCalledWith("my-token");
    expect(revokeToken).toHaveBeenCalledWith("my-token");
  });

  it("propagates a failure to revoke on the Google side", async () => {
    const provider = new GoogleOAuthProvider("client-id", "client-secret");
    provider.buildAuthedClient = vi.fn().mockReturnValue({
      revokeToken: vi.fn().mockRejectedValue(new Error("network down")),
    });

    await expect(provider.revokeConnection("my-token")).rejects.toThrow(
      "network down",
    );
  });
});

describe("authorizeWithGoogle", () => {
  const persist = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => persist.mockClear());

  it("exchanges, persists a refresh token, and returns token + identity", async () => {
    const provider = {
      exchangeCode: vi
        .fn()
        .mockResolvedValue({ accessToken: "at", refreshToken: "rt" }),
      getIdentity: vi.fn().mockResolvedValue({ id: "google_1" }),
    };

    const result = await authorizeWithGoogle(
      provider as any,
      "the-code",
      "the-redirect",
      persist,
    );

    expect(provider.exchangeCode).toHaveBeenCalledWith(
      "the-code",
      "the-redirect",
    );
    expect(persist).toHaveBeenCalledWith("rt", { id: "google_1" });
    expect(result).toEqual({
      tokens: { accessToken: "at", refreshToken: "rt" },
      identity: { id: "google_1" },
    });
  });

  it("does not persist when no refresh token is returned", async () => {
    const provider = {
      exchangeCode: vi.fn().mockResolvedValue({ accessToken: "at" }),
      getIdentity: vi.fn().mockResolvedValue({ id: "google_1" }),
    };

    const result = await authorizeWithGoogle(
      provider as any,
      "the-code",
      "the-redirect",
      persist,
    );

    expect(persist).not.toHaveBeenCalled();
    expect(result.identity).toEqual({ id: "google_1" });
  });
});
