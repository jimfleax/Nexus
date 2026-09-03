/**
 * @file drive.ts
 * @description Google Drive storage adapter implementing the upload-initialization, delete, and quota contracts.
 * @architecture Uses per-user OAuth refresh tokens, lazily creates a shared "Nexus" folder, returns resumable upload URIs, and wraps failures in StorageError.
 */

import { IStorageAdapter, StorageQuota, StorageError } from "./types.js";
import { UserModel } from "../../models/User.js";
import { google } from "googleapis";
import { buildOAuthClient } from "../google/oauth.js";

/**
 * @class DriveStorageAdapter
 * @description Storage adapter backed by Google Drive, authenticated per-owner via stored refresh tokens.
 */
export class DriveStorageAdapter implements IStorageAdapter {
  /**
   * @desc    Construct the adapter with the OAuth client credentials
   * @param   {string} clientId - Google OAuth client ID
   * @param   {string} clientSecret - Google OAuth client secret
   */
  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  /**
   * @desc    Build an authenticated Drive client for a user, or fail if Drive is not connected
   * @param   {string} ownerId - The user whose refresh token is used
   * @returns {Promise<object>} Resolved Drive client, user document, and OAuth client
   */
  private async getDrive(ownerId: string) {
    const user = await UserModel.findOne({ ownerId });
    if (!user || !user.driveRefreshToken) {
      throw new StorageError("Google Drive integration not configured");
    }

    const oauth2Client = buildOAuthClient(user.driveRefreshToken);

    return {
      drive: google.drive({ version: "v3", auth: oauth2Client }),
      user,
      oauth2Client,
    };
  }

  private folderLocks = new Map<string, Promise<string | null>>();

  /**
   * @desc    Resolve or create the user's shared "Nexus" Drive folder
   * @param   {object} drive - An authenticated Drive v3 client
   * @param   {object} user - The user document storing the folder reference
   * @returns {Promise<string|null>} The Drive folder ID, or null if unavailable
   */
  private async ensureDriveFolderInternal(
    drive: ReturnType<typeof google.drive>,
    user: any,
  ): Promise<string | null> {
    if (user.driveFolderId) {
      try {
        const folderRes = await drive.files.get({
          fileId: user.driveFolderId,
          fields: "id,trashed",
        });
        if (folderRes.data && !folderRes.data.trashed) {
          return user.driveFolderId;
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

    user.driveFolderId = folderId;
    await user.save();
    return folderId;
  }

  private async ensureDriveFolder(
    drive: ReturnType<typeof google.drive>,
    user: any,
  ): Promise<string | null> {
    const ownerId = user.ownerId;
    if (this.folderLocks.has(ownerId)) {
      return this.folderLocks.get(ownerId)!;
    }

    const promise = this.ensureDriveFolderInternal(drive, user).finally(() => {
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

  private async handleDriveError(err: any, ownerId: string) {
    const message = err?.message?.toLowerCase() || "";
    const status = err?.response?.status || err?.status;

    if (status === 401 || message.includes("invalid_grant")) {
      const user = await UserModel.findOne({ ownerId });
      if (user && user.driveRefreshToken) {
        user.driveRefreshToken = undefined;
        await user.save();
      }
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
      const { drive, user } = await this.getDrive(ownerId);
      let folderId = await this.ensureDriveFolder(drive, user);

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
      await this.handleDriveError(err, ownerId);
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
      const { drive, user, oauth2Client } = await this.getDrive(ownerId);

      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;

      let folderId = await this.ensureDriveFolder(drive, user);

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
      await this.handleDriveError(err, ownerId);
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
      await this.handleDriveError(err, ownerId);
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
        await this.handleDriveError(err, ownerId);
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
      await this.handleDriveError(err, ownerId);
      return null;
    }
  }
}
