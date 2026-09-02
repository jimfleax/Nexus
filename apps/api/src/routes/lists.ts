/**
 * @file lists.ts
 * @description Fastify plugin defining CRUD, reorder, and cascade-delete routes for knowledge lists.
 * @architecture Scoped by the auth plugin's tenant context; validates bodies via shared Zod schemas.
 *              Business logic delegated to list.service for testability.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CreateKnowledgeListSchema,
  UpdateKnowledgeListSchema,
  ReorderKnowledgeListSchema,
  KnowledgeListSchema,
  ErrorResponseSchema,
} from "@nexus/shared";
import { NotFoundError } from "../utils/errors.js";
import {
  listByProject,
  findListById,
  createList,
  updateList,
  reorderLists,
} from "../services/list.service.js";

/**
 * @module listRoutes
 * @description Fastify plugin exposing knowledge-list endpoints.
 */
export const listRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    List all knowledge lists for a project, ordered by position
   * @route   GET /api/projects/:projectId/lists
   * @access  Private
   */
  server.get(
    "/api/projects/:projectId/lists",
    {
      schema: {
        params: z.object({ projectId: z.string() }),
        response: {
          200: z.array(KnowledgeListSchema),
        },
      },
    },
    async (request, _reply) => {
      return listByProject(request.params.projectId);
    },
  );

  /**
   * @desc    Get a single knowledge list by ID
   * @route   GET /api/lists/:id
   * @access  Private
   */
  server.get(
    "/api/lists/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: KnowledgeListSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const list = await findListById(request.params.id);
      if (!list) {
        throw new NotFoundError("List", request.params.id);
      }
      return list;
    },
  );

  /**
   * @desc    Create a knowledge list in a project, slugified and appended to the end
   * @route   POST /api/projects/:projectId/lists
   * @access  Private
   */
  server.post(
    "/api/projects/:projectId/lists",
    {
      schema: {
        params: z.object({ projectId: z.string() }),
        body: CreateKnowledgeListSchema.omit({ projectId: true }),
        response: {
          201: KnowledgeListSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const list = await createList(request.params.projectId, request.body);
        return reply.status(201).send(list);
      } catch (error: any) {
        if (error.message === "Project not found") {
          throw new NotFoundError("Project", request.params.projectId);
        }
        throw error;
      }
    },
  );

  /**
   * @desc    Update a knowledge list's name/description, regenerating its slug when renamed
   * @route   PATCH /api/lists/:id
   * @access  Private
   */
  server.patch(
    "/api/lists/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateKnowledgeListSchema,
        response: {
          200: KnowledgeListSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const list = await updateList(request.params.id, request.body);

      if (!list) {
        throw new NotFoundError("List", request.params.id);
      }

      return list;
    },
  );

  /**
   * @desc    Delete a list and cascade-delete its resources, removing their Drive files first
   * @route   DELETE /api/lists/:id
   * @access  Private
   */
  server.delete(
    "/api/lists/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          204: z.null(),
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const listId = request.params.id;
      const ownerId = request.ownerId;

      const list = await findListById(listId);
      if (!list) {
        throw new NotFoundError("List", listId);
      }

      await server.deleter.deleteList(listId, ownerId);

      return reply.status(204).send(null);
    },
  );

  /**
   * @desc    Bulk-reorder lists within a project via atomic position updates
   * @route   PUT /api/projects/:projectId/lists/reorder
   * @access  Private
   */
  server.put(
    "/api/projects/:projectId/lists/reorder",
    {
      schema: {
        params: z.object({ projectId: z.string() }),
        body: ReorderKnowledgeListSchema,
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { items } = request.body;
      const ownerId = request.ownerId;

      await reorderLists(projectId, ownerId, items);

      return reply.send({ success: true });
    },
  );
};
