import { describe, it, expect, vi } from "vitest";

vi.mock("googleapis", () => ({
  google: {
    drive: vi.fn(() => ({
      files: { delete: vi.fn().mockResolvedValue({ data: {} }) },
    })),
    auth: { OAuth2: vi.fn() },
  },
}));

import { DriveStorageAdapter } from "../src/utils/storage/drive.js";

describe("DriveStorageAdapter client-builder injection", () => {
  it("uses the injected client builder with the user's refresh token", async () => {
    const credentialProvider = {
      getCredentials: vi.fn().mockResolvedValue({
        refreshToken: "refresh-token",
        folderId: "folder",
      }),
      saveFolderId: vi.fn().mockResolvedValue(undefined),
    };
    const buildClient = vi
      .fn()
      .mockReturnValue({ getAccessToken: async () => ({ token: "acc" }) });

    const adapter = new DriveStorageAdapter(
      "id",
      "secret",
      credentialProvider,
      buildClient,
    );

    await adapter.deleteFiles("owner-1", ["file-1"]);

    expect(credentialProvider.getCredentials).toHaveBeenCalledWith("owner-1");
    expect(buildClient).toHaveBeenCalledWith("refresh-token");
  });

  it("does not build a client when the user has no Drive credential", async () => {
    const credentialProvider = {
      getCredentials: vi.fn().mockResolvedValue(null),
      saveFolderId: vi.fn().mockResolvedValue(undefined),
    };
    const buildClient = vi.fn();

    const adapter = new DriveStorageAdapter(
      "id",
      "secret",
      credentialProvider,
      buildClient,
    );

    await adapter.deleteFiles("owner-1", ["file-1"]);

    expect(buildClient).not.toHaveBeenCalled();
  });
});
