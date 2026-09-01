/**
 * @file lists.ts
 * @description Fastify plugin defining CRUD, reorder, and cascade-delete routes for knowledge lists.
 * @architecture Scoped by the auth plugin's tenant context; validates bodies via shared Zod schemas and deletes linked resources transactionally.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import {
  CreateKnowledgeListSchema,
  UpdateKnowledgeListSchema,
  ReorderKnowledgeListSchema,
  KnowledgeListSchema,
} from "@nexus/shared";
import { ProjectModel } from "../models/Project.js";

import { ResourceModel } from "../models/Resource.js";
import mongoose from "mongoose";

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
    async (request, reply) => {
      const lists = await KnowledgeListModel.find({
        projectId: request.params.projectId,
      }).sort({ position: 1 });
      return lists;
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
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const list = await KnowledgeListModel.findById(request.params.id);
      if (!list) {
        return reply.status(404).send({ error: "List not found" });
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
        body: CreateKnowledgeListSchema.omit({ projectId: true }), // the projectId comes from URL
        response: {
          201: KnowledgeListSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const body = request.body;
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      // Find highest position to append to end
      const lastList = await KnowledgeListModel.findOne({ projectId }).sort({
        position: -1,
      });
      const position = lastList ? lastList.position + 1 : 0;

      const list = new KnowledgeListModel({
        ...body,
        projectId,
        slug,
        position,
      });

      try {
        await list.save();
        return reply.status(201).send(list);
      } catch (error: any) {
        if (error.code === 11000) {
          return reply.status(409).send({
            error: "List with this name already exists in the project",
          });
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
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const updates: any = { ...body };

      if (body.name) {
        updates.slug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      try {
        const list = await KnowledgeListModel.findByIdAndUpdate(
          request.params.id,
          { $set: updates },
          { new: true, runValidators: true },
        );

        if (!list) {
          return reply.status(404).send({ error: "List not found" });
        }

        return list;
      } catch (error: any) {
        if (error.code === 11000) {
          return reply.status(409).send({
            error: "List with this name already exists in the project",
          });
        }
        throw error;
      }
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
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const listId = request.params.id;
      const ownerId = (request as any).ownerId;

      const list = await KnowledgeListModel.findById(listId);
      if (!list) {
        return reply.status(404).send({ error: "List not found" });
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
      const ownerId = (request as any).ownerId;

      // Perform bulk atomic updates for position
      const bulkOps = items.map((item) => ({
        updateOne: {
          filter: { _id: item.id, projectId, ownerId }, // ensure they belong to this project and owner
          update: { $set: { position: item.position } },
        },
      }));

      if (bulkOps.length > 0) {
        await KnowledgeListModel.bulkWrite(bulkOps);
      }

      return reply.send({ success: true });
    },
  );
};
