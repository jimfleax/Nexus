/**
 * @file search.ts
 * @description Fastify plugin defining full-text search, suggestions, favorites, and recent feeds for resources.
 * @architecture Uses the tenant-isolated $text index for scored search (with an explicit ownerId guard), regex-based title suggestions, and lightweight list endpoints.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ResourceModel } from "../models/Resource.js";
import { ResourceSchema } from "@nexus/shared";
import { queryResources } from "../services/resource.service.js";

const scopeFilter = (ownerId: string, projectId?: string) => {
  const filter: any = { ownerId };
  if (projectId) filter.projectId = projectId;
  return filter;
};

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
      const ownerId = request.ownerId;

      const filter: any = {
        ...scopeFilter(ownerId, projectId),
        $text: { $search: q },
      };

      // Sort by text score
      const resources = await ResourceModel.find(filter, {
        score: { $meta: "textScore" },
      })
        .select("-content") // omit heavy content
        .sort({ score: { $meta: "textScore" } as any })
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
      const ownerId = request.ownerId;

      const filter: any = {
        ...scopeFilter(ownerId, projectId),
        title: { $regex: q, $options: "i" },
      };

      return queryResources(filter, { select: "title type", limit: 10 });
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
      const ownerId = request.ownerId;

      const filter: any = {
        ...scopeFilter(ownerId, projectId),
        isFavorite: true,
      };

      return queryResources(filter, { sort: { updatedAt: -1 } });
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
      const ownerId = request.ownerId;

      const filter: any = {
        ...scopeFilter(ownerId, projectId),
        lastOpenedAt: { $exists: true },
      };

      return queryResources(filter, { sort: { lastOpenedAt: -1 }, limit: 20 });
    },
  );
};
