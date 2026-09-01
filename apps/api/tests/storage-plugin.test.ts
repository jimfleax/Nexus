import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import { StorageError } from "../src/utils/storage/types.js";

describe("StoragePlugin & FakeStorageAdapter", () => {
  it("should register the plugin with FakeStorageAdapter", async () => {
    const app = Fastify();

    const fakeAdapter = new FakeStorageAdapter();
    app.register(storagePlugin, { adapter: fakeAdapter });
    await app.ready();

    expect(app.storage).toBeDefined();

    const uri = await app.storage.initializeUpload("user-1", {
      title: "test.pdf",
      mimeType: "application/pdf",
    });

    expect(uri).toContain("fake-storage.nexus.local");
    expect(fakeAdapter.uploads.get(uri)).toEqual({
      title: "test.pdf",
      mimeType: "application/pdf",
    });

    await app.storage.deleteFiles("user-1", ["file-1", "file-2"]);
    expect(fakeAdapter.deletedFiles.has("file-1")).toBe(true);
    expect(fakeAdapter.deletedFiles.has("file-2")).toBe(true);

    const quota = await app.storage.getQuota("user-1");
    expect(quota).toEqual({ usedInDrive: 1000, limit: 10000 });
  });

  it("should throw StorageError if credentials are missing and no adapter provided", async () => {
    const app = Fastify();
    try {
      app.register(storagePlugin, {});
      await app.ready();
      expect.fail("Should have thrown error");
    } catch (err: any) {
      expect(err.message).toContain("StoragePlugin requires");
    }
  });
});
