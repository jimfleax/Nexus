/**
 * @file info.ts
 * @description Fastify plugin defining the endpoint to fetch metadata for projects, collections, and resources.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { InfoSchema } from "@nexus/shared";
import { ProjectModel } from "../models/Project.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { ResourceModel } from "../models/Resource.js";

export const infoRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    Get metadata for a project, list, or resource
   * @route   GET /api/info
   * @access  Private
   */
  server.get(
    "/api/info",
    {
      schema: {
        querystring: z.object({
          type: z.enum(["project", "list", "resource"]),
          id: z.string(),
        }),
        response: {
          200: InfoSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { type, id } = request.query;

      if (type === "project") {
        const project = await ProjectModel.findById(id);
        if (!project) return reply.status(404).send({ error: "Project not found" });

        const listCount = await KnowledgeListModel.countDocuments({ projectId: id });
        const resourceCount = await ResourceModel.countDocuments({ projectId: id });

        return {
          id: project.id,
          type: "project" as const,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          listCount,
          resourceCount,
        };
      } else if (type === "list") {
        const list = await KnowledgeListModel.findById(id);
        if (!list) return reply.status(404).send({ error: "List not found" });

        const resourceCount = await ResourceModel.countDocuments({ listId: id });

        return {
          id: list.id,
          type: "list" as const,
          name: list.name,
          description: list.description,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          resourceCount,
        };
      } else if (type === "resource") {
        const resource = await ResourceModel.findById(id);
        if (!resource) return reply.status(404).send({ error: "Resource not found" });

        return {
          id: resource.id,
          type: "resource" as const,
          name: resource.title,
          description: resource.description,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
          resourceType: resource.type,
          mimeType: resource.mimeType,
          size: resource.size,
          status: resource.status,
          readingTime: resource.readingTime,
        };
      }
    }
  );
};
