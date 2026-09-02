/**
 * @file user.service.ts
 * @description Business logic for user operations, extracted from route handlers.
 * @architecture Pure Mongoose operations plus storage adapter calls.
 *              Handles find-or-create, settings updates, and metrics aggregation.
 */

import { UserModel } from "../models/User.js";
import { ResourceModel } from "../models/Resource.js";
import { ProjectModel } from "../models/Project.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { IStorageAdapter } from "../utils/storage/types.js";

/**
 * @constant {readonly string[]} STORAGE_BEARING_TYPES
 * @description Resource types whose size is stored in Drive and counted in storage metrics.
 */
const STORAGE_BEARING_TYPES = [
  "markdown",
  "pdf",
  "image",
  "ebook",
  "text",
] as const;

/**
 * @desc    Find a user by ownerId, creating one if it does not exist
 * @param   {string} ownerId - The owner identifier
 * @returns {Promise<any>} The user document
 */
export async function findOrCreateUser(ownerId: string) {
  let user = await UserModel.findOne({ ownerId });
  if (!user) {
    try {
      user = await UserModel.create({ ownerId });
    } catch (err: any) {
      if (err.code === 11000) {
        user = await UserModel.findOne({ ownerId });
      } else {
        throw err;
      }
    }
  }
  return user;
}

/**
 * @desc    Get user settings (drive refresh token)
 * @param   {string} ownerId - The owner identifier
 * @returns {Promise<{ driveRefreshToken: string | undefined }>} Settings DTO
 */
export async function getSettings(ownerId: string) {
  const user = await findOrCreateUser(ownerId);
  return { driveRefreshToken: user.driveRefreshToken };
}

/**
 * @desc    Update user settings (drive refresh token)
 * @param   {string} ownerId - The owner identifier
 * @param   {object} input - Settings to update
 * @returns {Promise<{ driveRefreshToken: string | undefined }>} Updated settings DTO
 */
export async function updateSettings(
  ownerId: string,
  input: { driveRefreshToken?: string },
) {
  const user = await findOrCreateUser(ownerId);

  if (input.driveRefreshToken !== undefined) {
    user.driveRefreshToken = input.driveRefreshToken;
    await user.save();
  }

  return { driveRefreshToken: user.driveRefreshToken };
}

/**
 * @desc    List favorite resources for the current tenant
 * @returns {Promise<Array>} Favorited resources, newest updated first
 */
export async function getFavorites() {
  return ResourceModel.find({ isFavorite: true })
    .select("-content")
    .sort({ updatedAt: -1 });
}

/**
 * @desc    List recently opened resources for the current tenant
 * @param   {number} limit - Maximum results (default 10)
 * @returns {Promise<Array>} Recent resources
 */
export async function getRecent(limit = 10) {
  return ResourceModel.find()
    .select("-content")
    .sort({ lastOpenedAt: -1, updatedAt: -1 })
    .limit(limit);
}

/**
 * @interface StorageMetrics
 * @description Shape of the aggregated storage metrics response.
 */
export interface StorageMetrics {
  usedByNexus: number;
  resourceCount: number;
  projectCount: number;
  listCount: number;
  byType: Record<string, number>;
  drive: {
    connected: boolean;
    usedInDrive: number | null;
    limit: number | null;
    remaining: number | null;
  };
}

/**
 * @desc    Aggregate storage metrics: resource counts, per-type sizes, and Drive quota
 * @param   {string} ownerId - The owner identifier
 * @param   {IStorageAdapter} storage - The storage adapter for quota queries
 * @returns {Promise<StorageMetrics>} Aggregated metrics
 */
export async function getMetrics(
  ownerId: string,
  storage: IStorageAdapter,
): Promise<StorageMetrics> {
  const agg = await ResourceModel.aggregate([
    {
      $group: {
        _id: "$type",
        totalSize: { $sum: { $ifNull: ["$size", 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  let usedByNexus = 0;
  let resourceCount = 0;
  const byType: Record<string, number> = {};
  for (const type of STORAGE_BEARING_TYPES) {
    byType[type] = 0;
  }

  for (const row of agg) {
    resourceCount += row.count;
    if (STORAGE_BEARING_TYPES.includes(row._id)) {
      byType[row._id] = row.totalSize;
      usedByNexus += row.totalSize;
    }
  }

  const [projectCount, listCount] = await Promise.all([
    ProjectModel.countDocuments(),
    KnowledgeListModel.countDocuments(),
  ]);

  let drive: StorageMetrics["drive"] = {
    connected: false,
    usedInDrive: null,
    limit: null,
    remaining: null,
  };
  try {
    const quota = await storage.getQuota(ownerId);
    if (quota) {
      drive = {
        connected: true,
        usedInDrive: quota.usedInDrive,
        limit: quota.limit,
        remaining:
          quota.limit === null ? null : quota.limit - quota.usedInDrive,
      };
    }
  } catch (err: any) {
    console.error(`Failed to fetch drive quota for ${ownerId}:`, err.message);
  }

  return {
    usedByNexus,
    resourceCount,
    projectCount,
    listCount,
    byType,
    drive,
  };
}
