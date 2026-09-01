/**
 * @file gc.ts
 * @description Background garbage collection that sweeps stale pending resources and their orphaned Google Drive files.
 * @architecture Triggers on the health endpoint; reaps resources stuck in "pending" for more than 30 minutes, deleting the resource record and its Drive file using the owning user's stored refresh token.
 */

import { ResourceModel } from "./models/Resource.js";
import { UserModel } from "./models/User.js";
import { google } from "googleapis";

let isGCRunning = false;

/**
 * @desc    Delete pending resources older than 30 minutes, removing orphaned Drive files where present
 * @returns {Promise<void>} Resolves when the sweep completes; never throws
 */
export async function runGarbageCollection() {
  if (isGCRunning) return;
  isGCRunning = true;

  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find resources pending for > 30 mins
    const staleResources = await ResourceModel.find({
      status: "pending",
      updatedAt: { $lt: thirtyMinsAgo },
    });

    for (const resource of staleResources) {
      if (resource.driveFileId) {
        // Need to delete orphan drive file
        try {
          const user = await UserModel.findOne({ ownerId: resource.ownerId });
          if (user && user.driveRefreshToken) {
            const oauth2Client = new google.auth.OAuth2(
              process.env.AUTH_GOOGLE_ID,
              process.env.AUTH_GOOGLE_SECRET,
            );
            oauth2Client.setCredentials({
              refresh_token: user.driveRefreshToken,
            });
            const drive = google.drive({ version: "v3", auth: oauth2Client });
            await drive.files.delete({ fileId: resource.driveFileId });
          }
        } catch (err) {
          console.error(
            `Failed to delete orphan drive file ${resource.driveFileId}:`,
            err,
          );
        }
      }

      // Delete the pending resource record
      await ResourceModel.findByIdAndDelete(resource._id);
    }
  } catch (error) {
    console.error("Garbage collection sweep failed:", error);
  } finally {
    isGCRunning = false;
  }
}
