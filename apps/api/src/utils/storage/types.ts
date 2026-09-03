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
    metadata: {
      title: string;
      mimeType: string;
      projectId?: string;
      listId?: string;
    },
    fileStream: Readable,
  ): Promise<{ driveFileId: string; size: number }>;
  initializeUpload(
    ownerId: string,
    metadata: {
      title: string;
      mimeType: string;
      projectId?: string;
      listId?: string;
    },
  ): Promise<string>;
  deleteFiles(ownerId: string, fileIds: string[]): Promise<void>;
  getQuota(ownerId: string): Promise<StorageQuota | null>;
  getFileStream(
    ownerId: string,
    fileId: string,
    rangeHeader?: string,
  ): Promise<{
    stream: Readable;
    headers: Record<string, string>;
    status: number;
  }>;
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

/**
 * @class TokenRevokedError
 * @description Error type thrown when Google Drive API returns 401 or invalid_grant.
 */
export class TokenRevokedError extends StorageError {
  constructor(
    message: string,
    public readonly ownerId: string,
    cause?: any,
  ) {
    super(message, cause);
    this.name = "TokenRevokedError";
  }
}

/**
 * @interface IDriveCredentialProvider
 * @description Decouples the DriveStorageAdapter from the Domain UserModel.
 */
export interface IDriveCredentialProvider {
  getCredentials(
    ownerId: string,
  ): Promise<{ refreshToken: string; folderId?: string } | null>;
  saveFolderId(ownerId: string, folderId: string): Promise<void>;
}
