/**
 * @file search.ts
 * @description Fastify plugin defining full-text search, suggestions, favorites, and recent feeds for resources.
 * @architecture Uses the tenant-isolated $text index for scored search (with an explicit ownerId guard), regex-based title suggestions, and lightweight list endpoints.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ResourceModel } from "../models/Resource.js";
import { ResourceSchema } from "@nexus/shared";

/**
 * @module searchRoutes
 * @description Fastify plugin exposing search, favorites, and recent endpoints.
 */
export const searchRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    Full-text search over resources with textScore ordering, scoped to owner and optional project
   * @route   GET /api/search
   * @access  Private
   */
  server.get(
    "/api/search",
    {
      schema: {
        querystring: z.object({
          q: z.string().min(1),
          projectId: z.string().optional(),
        }),
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { q, projectId } = request.query;
      const ownerId = (request as any).ownerId;

      const filter: any = {
        ownerId, // enforced here manually to be absolutely safe, though plugin handles it
        $text: { $search: q },
      };

      if (projectId) {
        filter.projectId = projectId;
      }

      // Sort by text score
      const resources = await ResourceModel.find(filter, {
        score: { $meta: "textScore" },
      })
        .select("-content") // omit heavy content
        .sort({ score: { $meta: "textScore" } })
        .limit(50);

      return resources;
    },
  );

  /**
   * @desc    Return lightweight title suggestions matching a query via case-insensitive regex
   * @route   GET /api/search/suggestions
   * @access  Private
   */
  server.get(
    "/api/search/suggestions",
    {
      schema: {
        querystring: z.object({
          q: z.string().min(1),
          projectId: z.string().optional(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              type: z.string(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const { q, projectId } = request.query;
      const ownerId = (request as any).ownerId;

      const filter: any = {
        ownerId,
        title: { $regex: q, $options: "i" },
      };

      if (projectId) {
        filter.projectId = projectId;
      }

      const suggestions = await ResourceModel.find(filter)
        .select("title type")
        .limit(10);

      return suggestions;
    },
  );

  /**
   * @desc    List favorite resources, newest updated first
   * @route   GET /api/favorites
   * @access  Private
   */
  server.get(
    "/api/favorites",
    {
      schema: {
        querystring: z.object({
          projectId: z.string().optional(),
        }),
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.query;
      const ownerId = (request as any).ownerId;

      const filter: any = { ownerId, isFavorite: true };
      if (projectId) {
        filter.projectId = projectId;
      }

      const resources = await ResourceModel.find(filter)
        .select("-content")
        .sort({ updatedAt: -1 });

      return resources;
    },
  );

  /**
   * @desc    List recently opened resources, most recent first
   * @route   GET /api/recent
   * @access  Private
   */
  server.get(
    "/api/recent",
    {
      schema: {
        querystring: z.object({
          projectId: z.string().optional(),
        }),
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.query;
      const ownerId = (request as any).ownerId;

      const filter: any = { ownerId, lastOpenedAt: { $exists: true } };
      if (projectId) {
        filter.projectId = projectId;
      }

      const resources = await ResourceModel.find(filter)
        .select("-content")
        .sort({ lastOpenedAt: -1 })
        .limit(20);

      return resources;
    },
  );
};
