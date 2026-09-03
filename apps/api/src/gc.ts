/**
 * @file gc.ts
 * @description Background garbage collection that sweeps stale pending resources and their orphaned Google Drive files.
 * @architecture Triggers on the health endpoint; reaps resources stuck in "pending" for more than 30 minutes, deleting the resource record and its Drive file using the owning user's stored refresh token.
 */

import { ResourceModel } from "./models/Resource.js";
import { UserModel } from "./models/User.js";
import { IStorageAdapter } from "./utils/storage/types.js";

let isGCRunning = false;

/**
 * @desc    Delete pending resources older than 30 minutes, removing orphaned Drive files where present
 * @returns {Promise<void>} Resolves when the sweep completes; never throws
 */
export async function runGarbageCollection(storageAdapter: IStorageAdapter) {
  if (isGCRunning) return;
  isGCRunning = true;

  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find resources pending for > 30 mins
    const staleResources = await ResourceModel.find(
      {
        status: "pending",
        updatedAt: { $lt: thirtyMinsAgo },
      },
      null,
      { skipTenant: true },
    );

    for (const resource of staleResources) {
      if (resource.driveFileId) {
        let driveDeleteSucceeded = false;
        // Need to delete orphan drive file
        try {
          await storageAdapter.deleteFiles(resource.ownerId, [
            resource.driveFileId,
          ]);
          driveDeleteSucceeded = true;
        } catch (err: any) {
          if (
            err.name === "TokenRevokedError" ||
            (err &&
              err.constructor &&
              err.constructor.name === "TokenRevokedError")
          ) {
            await UserModel.updateOne(
              { ownerId: resource.ownerId },
              { $unset: { driveRefreshToken: 1 } },
              { skipTenant: true },
            );
          }
          console.error(
            `Failed to delete orphan drive file ${resource.driveFileId}:`,
            err,
          );
        }

        if (!driveDeleteSucceeded) {
          continue;
        }
      }

      // Delete the pending resource record
      await ResourceModel.findByIdAndDelete(resource._id, { skipTenant: true });
    }
  } catch (error) {
    console.error("Garbage collection sweep failed:", error);
  } finally {
    isGCRunning = false;
  }
}
