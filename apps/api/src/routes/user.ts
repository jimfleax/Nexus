/**
 * @file user.ts
 * @description Fastify plugin defining user settings, favorites, recent, and storage metrics endpoints.
 * @architecture Business logic delegated to user.service for testability.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  UserSettingsSchema,
  UpdateUserSettingsSchema,
  ResourceSchema,
  UserMetricsSchema,
} from "@nexus/shared";
import {
  getSettings,
  updateSettings,
  getFavorites,
  getRecent,
  getMetrics,
} from "../services/user.service.js";

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
    async (request, _reply) => {
      return getSettings(request.ownerId);
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
    async (request, _reply) => {
      return updateSettings(request.ownerId, request.body);
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
    async (_request, _reply) => {
      return getFavorites();
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
    async (_request, _reply) => {
      return getRecent();
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
    async (request, _reply) => {
      return getMetrics(request.ownerId, server.storage);
    },
  );
};
