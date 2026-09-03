/**
 * @file drive.ts
 * @description Google Drive storage adapter implementing the upload-initialization, delete, and quota contracts.
 * @architecture Uses per-user OAuth refresh tokens, lazily creates a shared "Nexus" folder, returns resumable upload URIs, and wraps failures in StorageError.
 */

import {
  IStorageAdapter,
  StorageQuota,
  StorageError,
  TokenRevokedError,
  IDriveCredentialProvider,
} from "./types.js";
import { google } from "googleapis";

/**
 * @class DriveStorageAdapter
 * @description Storage adapter backed by Google Drive, authenticated per-owner via stored refresh tokens.
 */
export class DriveStorageAdapter implements IStorageAdapter {
  /**
   * @desc    Construct the adapter with the OAuth client credentials
   * @param   {string} clientId - Google OAuth client ID
   * @param   {string} clientSecret - Google OAuth client secret
   * @param   {IDriveCredentialProvider} credentialProvider - Handles fetching and saving Drive credentials
   */
  constructor(
    private clientId: string,
    private clientSecret: string,
    private credentialProvider: IDriveCredentialProvider,
    private clientBuilder: (refreshToken: string) => any = (rt) => {
      throw new Error("Storage client builder not configured");
    },
  ) {}

  /**
   * @desc    Build an authenticated Drive client for a user, or fail if Drive is not connected
   * @param   {string} ownerId - The user whose refresh token is used
   * @returns {Promise<object>} Resolved Drive client, user document, and OAuth client
   */
  private async getDrive(ownerId: string) {
    const creds = await this.credentialProvider.getCredentials(ownerId);
    if (!creds || !creds.refreshToken) {
      throw new StorageError("Google Drive integration not configured");
    }

    const oauth2Client = this.clientBuilder(creds.refreshToken);

    return {
      drive: google.drive({ version: "v3", auth: oauth2Client }),
      folderId: creds.folderId,
      oauth2Client,
    };
  }

  private folderLocks = new Map<string, Promise<string | null>>();

  /**
   * @desc    Resolve or create the user's shared "Nexus" Drive folder
   * @param   {object} drive - An authenticated Drive v3 client
   * @param   {string} ownerId - The owner's ID
   * @param   {string} cachedFolderId - The previously saved folder ID, if any
   * @returns {Promise<string|null>} The Drive folder ID, or null if unavailable
   */
  private async ensureDriveFolderInternal(
    drive: ReturnType<typeof google.drive>,
    ownerId: string,
    cachedFolderId?: string,
  ): Promise<string | null> {
    if (cachedFolderId) {
      try {
        const folderRes = await drive.files.get({
          fileId: cachedFolderId,
          fields: "id,trashed",
        });
        if (folderRes.data && !folderRes.data.trashed) {
          return cachedFolderId;
        }
      } catch (err) {
        // Fall through
      }
    }

    const query =
      "name = 'Nexus' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const searchRes = await drive.files.list({
      q: query,
      spaces: "drive",
      fields: "files(id)",
    });

    let folderId = searchRes.data.files?.[0]?.id;

    if (!folderId) {
      const createRes = await drive.files.create({
        requestBody: {
          name: "Nexus",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = createRes.data.id!;
    }

    await this.credentialProvider.saveFolderId(ownerId, folderId);
    return folderId;
  }

  private async ensureDriveFolder(
    drive: ReturnType<typeof google.drive>,
    ownerId: string,
    cachedFolderId?: string,
  ): Promise<string | null> {
    if (this.folderLocks.has(ownerId)) {
      return this.folderLocks.get(ownerId)!;
    }

    const promise = this.ensureDriveFolderInternal(
      drive,
      ownerId,
      cachedFolderId,
    ).finally(() => {
      this.folderLocks.delete(ownerId);
    });

    this.folderLocks.set(ownerId, promise);
    return promise;
  }

  private async getOrCreateSubfolder(
    drive: ReturnType<typeof google.drive>,
    name: string,
    parentId: string,
  ): Promise<string> {
    const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      spaces: "drive",
      fields: "files(id)",
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id!;
    }

    const createRes = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });

    return createRes.data.id!;
  }

  private handleDriveError(err: any, ownerId: string) {
    const message = err?.message?.toLowerCase() || "";
    const status = err?.response?.status || err?.status;

    if (status === 401 || message.includes("invalid_grant")) {
      throw new TokenRevokedError("Google Drive token revoked", ownerId, err);
    }
  }

  async uploadFile(
    ownerId: string,
    metadata: {
      title: string;
      mimeType: string;
      projectId?: string;
      listId?: string;
    },
    fileStream: import("stream").Readable,
  ): Promise<{ driveFileId: string; size: number }> {
    try {
      const { drive, folderId: cachedFolderId } = await this.getDrive(ownerId);
      let folderId = await this.ensureDriveFolder(
        drive,
        ownerId,
        cachedFolderId,
      );

      if (folderId && metadata.projectId) {
        folderId = await this.getOrCreateSubfolder(
          drive,
          metadata.projectId,
          folderId,
        );
        if (metadata.listId) {
          folderId = await this.getOrCreateSubfolder(
            drive,
            metadata.listId,
            folderId,
          );
        }
      }

      const parents = folderId ? [folderId] : undefined;

      const res = await drive.files.create({
        requestBody: {
          name: metadata.title,
          mimeType: metadata.mimeType,
          parents,
        },
        media: {
          mimeType: metadata.mimeType,
          body: fileStream,
        },
        fields: "id,size",
      });

      if (!res.data.id) {
        throw new Error("No file ID returned from Google Drive");
      }

      return {
        driveFileId: res.data.id,
        size: res.data.size ? parseInt(res.data.size, 10) : 0,
      };
    } catch (err: any) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(err.message || "Failed to upload file", err);
    }
  }

  /**
   * @desc    Begin a Drive resumable upload and return the upload URI for the client
   * @param   {string} ownerId - The owning user
   * @param   {object} metadata - Title and MIME type of the file to upload
   * @returns {Promise<string>} The resumable upload URI
   */
  async initializeUpload(
    ownerId: string,
    metadata: {
      title: string;
      mimeType: string;
      projectId?: string;
      listId?: string;
    },
  ): Promise<string> {
    try {
      const {
        drive,
        folderId: cachedFolderId,
        oauth2Client,
      } = await this.getDrive(ownerId);

      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;

      let folderId = await this.ensureDriveFolder(
        drive,
        ownerId,
        cachedFolderId,
      );

      if (folderId && metadata.projectId) {
        folderId = await this.getOrCreateSubfolder(
          drive,
          metadata.projectId,
          folderId,
        );
        if (metadata.listId) {
          folderId = await this.getOrCreateSubfolder(
            drive,
            metadata.listId,
            folderId,
          );
        }
      }
      const parents = folderId ? [folderId] : undefined;

      const driveRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": metadata.mimeType,
            // We omit Origin since this is server-to-server, or could pass a configured origin.
            // But since we are extracting this, we don't have access to request headers natively.
          },
          body: JSON.stringify({
            name: metadata.title,
            mimeType: metadata.mimeType,
            parents,
          }),
        },
      );

      if (!driveRes.ok) {
        throw new Error(`Failed to initialize upload: ${driveRes.statusText}`);
      }

      const uploadUri = driveRes.headers.get("location");
      if (!uploadUri) {
        throw new Error("Upload URI not returned by Google Drive");
      }

      return uploadUri;
    } catch (err: any) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        err.message || "Failed to initialize storage",
        err,
      );
    }
  }

  /**
   * @desc    Delete multiple Drive files for a user, skipping silently when Drive is not connected
   * @param   {string} ownerId - The owning user
   * @param   {string[]} fileIds - Drive file IDs to delete
   * @returns {Promise<void>} Resolves when deletion attempts complete
   */
  async deleteFiles(ownerId: string, fileIds: string[]): Promise<void> {
    if (!fileIds || fileIds.length === 0) return;

    let drive;
    try {
      const res = await this.getDrive(ownerId);
      drive = res.drive;
    } catch (err) {
      try {
        this.handleDriveError(err, ownerId);
      } catch (revokedErr) {
        throw revokedErr;
      }
      console.warn(
        `User ${ownerId} has no drive credentials, cannot delete files`,
      );
      return;
    }

    for (const fileId of fileIds) {
      if (!fileId) continue;
      try {
        await drive.files.delete({ fileId });
      } catch (err: any) {
        this.handleDriveError(err, ownerId);
        console.error(`Failed to delete drive file ${fileId}:`, err.message);
      }
    }
  }

  /**
   * @desc    Fetch the user's Drive storage quota
   * @param   {string} ownerId - The owning user
   * @returns {Promise<StorageQuota|null>} Quota snapshot, or null when unavailable
   */
  async getQuota(ownerId: string): Promise<StorageQuota | null> {
    try {
      const { drive } = await this.getDrive(ownerId);

      const res = await drive.about.get({
        fields: "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)",
      });

      const quota = res.data.storageQuota;
      if (!quota || quota.usageInDrive == null) {
        return null;
      }

      return {
        usedInDrive: Number(quota.usageInDrive),
        limit: quota.limit != null ? Number(quota.limit) : null,
      };
    } catch (err) {
      this.handleDriveError(err, ownerId);
      return null;
    }
  }

  async getFileStream(
    ownerId: string,
    fileId: string,
    rangeHeader?: string,
  ): Promise<{
    stream: import("stream").Readable;
    headers: Record<string, string>;
    status: number;
  }> {
    try {
      const { oauth2Client } = await this.getDrive(ownerId);
      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };
      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers },
      );

      if (!driveRes.ok) {
        throw new Error(
          `Failed to fetch file from Drive: ${driveRes.statusText}`,
        );
      }

      const resultHeaders: Record<string, string> = {};
      const safeDriveHeaders = [
        "content-type",
        "content-disposition",
        "content-range",
        "accept-ranges",
      ];
      driveRes.headers.forEach((value, key) => {
        if (safeDriveHeaders.includes(key.toLowerCase())) {
          resultHeaders[key] = value;
        }
      });
      resultHeaders["accept-ranges"] = "bytes";

      const streamModule = await import("stream");
      return {
        stream: streamModule.Readable.fromWeb(driveRes.body as any),
        headers: resultHeaders,
        status: driveRes.status,
      };
    } catch (err: any) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        err.message || "Failed to download file stream",
        err,
      );
    }
  }
}
