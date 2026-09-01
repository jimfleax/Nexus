/**
 * @file types.ts
 * @description Shared contracts and error type for the pluggable storage layer.
 * @architecture Defines the IStorageAdapter interface implemented by both Drive and fake adapters, plus the StorageError type used to report Drive integration failures.
 */

/**
 * @interface StorageQuota
 * @description Drive usage snapshot returned to the metrics endpoint.
 */
export interface StorageQuota {
  usedInDrive: number;
  limit: number | null;
}

import type { Readable } from "stream";

/**
 * @interface IStorageAdapter
 * @description Contract for uploading files, deleting files, and reading quota for a storage backend.
 */
export interface IStorageAdapter {
  uploadFile(
    ownerId: string,
    metadata: { title: string; mimeType: string },
    fileStream: Readable,
  ): Promise<{ driveFileId: string; size: number }>;
  initializeUpload(
    ownerId: string,
    metadata: { title: string; mimeType: string },
  ): Promise<string>;
  deleteFiles(ownerId: string, fileIds: string[]): Promise<void>;
  getQuota(ownerId: string): Promise<StorageQuota | null>;
}

/**
 * @class StorageError
 * @description Error type used by storage adapters to signal recoverable Google Drive failures.
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: any,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
