/**
 * @file fake.ts
 * @description In-memory storage adapter for local development and tests.
 * @architecture Records upload URIs and deleted file IDs in memory and returns a fixed quota, letting the app run without Google credentials.
 */

import { IStorageAdapter, StorageQuota } from "./types.js";

/**
 * @class FakeStorageAdapter
 * @description Test/demo adapter that never touches Google Drive.
 */
export class FakeStorageAdapter implements IStorageAdapter {
  public uploads = new Map<string, { title: string; mimeType: string }>();
  public deletedFiles = new Set<string>();

  /**
   * @desc    Generate a fake resumable upload URI and record the upload in memory
   * @param   {string} ownerId - The owning user (unused)
   * @param   {object} metadata - Title and MIME type of the file
   * @returns {Promise<string>} A fake upload URI
   */
  async initializeUpload(
    ownerId: string,
    metadata: { title: string; mimeType: string },
  ): Promise<string> {
    const uploadUri = `https://fake-storage.nexus.local/upload/${Math.random().toString(36).substring(7)}`;
    this.uploads.set(uploadUri, metadata);
    return uploadUri;
  }

  /**
   * @desc    Record file IDs as deleted in memory
   * @param   {string} ownerId - The owning user (unused)
   * @param   {string[]} fileIds - IDs to mark deleted
   * @returns {Promise<void>} Resolves immediately
   */
  async deleteFiles(ownerId: string, fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      this.deletedFiles.add(id);
    }
  }

  /**
   * @desc    Return a fixed fake quota
   * @param   {string} ownerId - The owning user (unused)
   * @returns {Promise<StorageQuota>} A constant quota snapshot
   */
  async getQuota(ownerId: string): Promise<StorageQuota | null> {
    return { usedInDrive: 1000, limit: 10000 };
  }
}
