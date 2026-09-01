/**
 * @file user.ts
 * @description Fastify plugin defining user settings, favorites, recent, and storage metrics endpoints.
 * @architecture Reads/writes the UserModel for Drive integration, reuses the resource query surface, and aggregates Drive quota plus per-type storage metrics for the settings page.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { ResourceModel } from "../models/Resource.js";
import { ProjectModel } from "../models/Project.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";

import {
  UserSettingsSchema,
  UpdateUserSettingsSchema,
  ResourceSchema,
  UserMetricsSchema,
} from "@nexus/shared";

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
 * @module userRoutes
 * @description Fastify plugin exposing user settings and metrics endpoints.
 */
export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    Get the current user's settings, creating the user record on first visit
   * @route   GET /api/user/settings
   * @access  Private
   */
  server.get(
    "/api/user/settings",
    {
      schema: {
        response: {
          200: UserSettingsSchema,
        },
      },
    },
    async (request, reply) => {
      const ownerId = (request as any).ownerId;
      let user = await UserModel.findOne({ ownerId });
      if (!user) {
        user = await UserModel.create({ ownerId });
      }
      return {
        driveRefreshToken: user.driveRefreshToken,
      };
    },
  );

  /**
   * @desc    Update the current user's settings, e.g. the Drive refresh token
   * @route   PATCH /api/user/settings
   * @access  Private
   */
  server.patch(
    "/api/user/settings",
    {
      schema: {
        body: UpdateUserSettingsSchema,
        response: {
          200: UserSettingsSchema,
        },
      },
    },
    async (request, reply) => {
      const ownerId = (request as any).ownerId;
      const body = request.body;

      let user = await UserModel.findOne({ ownerId });
      if (!user) {
        user = await UserModel.create({ ownerId, ...body });
      } else {
        if (body.driveRefreshToken !== undefined) {
          user.driveRefreshToken = body.driveRefreshToken;
        }
        await user.save();
      }

      return {
        driveRefreshToken: user.driveRefreshToken,
      };
    },
  );

  /**
   * @desc    List the current user's favorite resources
   * @route   GET /api/user/favorites
   * @access  Private
   */
  server.get(
    "/api/user/favorites",
    {
      schema: {
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      // tenant isolation plugin handles filtering by ownerId automatically
      const resources = await ResourceModel.find({ isFavorite: true })
        .select("-content")
        .sort({ updatedAt: -1 });
      return resources;
    },
  );

  /**
   * @desc    List recently opened resources, falling back to recency by updatedAt
   * @route   GET /api/user/recent
   * @access  Private
   */
  server.get(
    "/api/user/recent",
    {
      schema: {
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      // sort by lastOpenedAt descending, fallback to updatedAt descending
      const resources = await ResourceModel.find()
        .select("-content")
        .sort({ lastOpenedAt: -1, updatedAt: -1 })
        .limit(10);
      return resources;
    },
  );

  /**
   * @desc    Aggregate storage metrics: resource counts, per-type sizes, and Drive quota
   * @route   GET /api/user/metrics
   * @access  Private
   */
  server.get(
    "/api/user/metrics",
    {
      schema: {
        response: {
          200: UserMetricsSchema,
        },
      },
    },
    async (request, reply) => {
      const ownerId = (request as any).ownerId;

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

      let drive: any = {
        connected: false,
        usedInDrive: null,
        limit: null,
        remaining: null,
      };
      try {
        const quota = await server.storage.getQuota(ownerId);
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
        console.error(
          `Failed to fetch drive quota for ${ownerId}:`,
          err.message,
        );
      }

      return {
        usedByNexus,
        resourceCount,
        projectCount,
        listCount,
        byType,
        drive,
      };
    },
  );
};
