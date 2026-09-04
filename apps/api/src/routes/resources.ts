/**
 * @file resources.ts
 * @description Fastify plugin defining CRUD, file-upload handoff, streaming, favorite, and open-tracking routes for resources.
 * @architecture Tenant-isolated; validates with shared Zod schemas. Business logic delegated to
 *              resource.service for testability. HTTP-specific concerns (multipart, Drive streaming)
 *              remain in the route handler.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import {
  CreateResourceSchema,
  UpdateResourceSchema,
  ResourceSchema,
} from "@nexus/shared";
import { Readable } from "stream";
import {
  listResourcesByProject,
  findResourceById,
  isDuplicateTitle,
  validateListMembership,
  findListById,
  createResource,
  updateResource,
  toggleFavoriteResource,
  deleteResourceById,
  createResourceWithUpload,
} from "../services/resource.service.js";
import { parseMultipartResourceRequest } from "../utils/multipart.js";
import { FastifyReply } from "fastify";

/** Send a 404 with the raw `{ error }` shape matching this route file's existing responses. */
function notFoundReply(reply: FastifyReply, message = "Resource not found") {
  return reply.status(404).send({ error: message });
}

/**
 * @module resourceRoutes
 * @description Fastify plugin exposing resource endpoints.
 */
export const resourceRoutes: FastifyPluginAsyncZod = async (server) => {
  /**
   * @desc    List resources in a project, optionally filtered by list, omitting heavy content
   * @route   GET /api/projects/:projectId/resources
   * @access  Private
   */
  server.get(
    "/api/projects/:projectId/resources",
    {
      schema: {
        params: z.object({ projectId: z.string() }),
        querystring: z.object({ listId: z.string().optional() }),
        response: {
          200: z.array(ResourceSchema),
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { listId } = request.query;
      return listResourcesByProject(projectId, listId);
    },
  );

  /**
   * @desc    Create a resource, initializing a Drive upload when the resource is a file type
   * @route   POST /api/resources
   * @access  Private
   */
  server.post(
    "/api/resources",
    {
      bodyLimit: 14 * 1024 * 1024, // 14MB limit
      schema: {
        response: {
          201: ResourceSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      let body: any;
      let fileStream: any;
      let mimeType = "";

      if (request.isMultipart()) {
        const parsed = await parseMultipartResourceRequest(request);
        body = parsed.body;
        fileStream = parsed.fileStream;
        mimeType = parsed.mimeType;
      } else {
        body = request.body;
      }

      const parsedBody = CreateResourceSchema.safeParse(body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "Invalid payload: " + parsedBody.error.message,
        } as any);
      }

      try {
        const resource = await createResourceWithUpload(
          request.ownerId,
          parsedBody.data,
          server.storage,
          fileStream,
          mimeType,
        );
        return reply.status(201).send(resource);
      } catch (err: any) {
        if (err.message.includes("Knowledge List not found")) {
          return reply.status(404).send({ error: err.message } as any);
        }
        if (
          err.message.includes("already exists") ||
          err.name === "StorageError" ||
          err.message.includes("stream required")
        ) {
          return reply.status(400).send({ error: err.message } as any);
        }
        request.log.error(err, "Resource creation failed");
        return reply
          .status(500)
          .send({ error: "Internal server error" } as any);
      }
    },
  );

  /**
   * @desc    Get a single resource by ID
   * @route   GET /api/resources/:id
   * @access  Private
   */
  server.get(
    "/api/resources/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: ResourceSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const resource = await findResourceById(request.params.id);
      if (!resource) return notFoundReply(reply);
      return resource;
    },
  );

  /**
   * @route   GET /api/resources/:id/file
   * @access  Private
   */
  server.get(
    "/api/resources/:id/file",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
          // 200 is omitted because it streams binary data
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const ownerId = request.ownerId;

      const resource = await findResourceById(id);
      if (!resource || !resource.driveFileId) {
        return notFoundReply(reply, "Resource or file not found");
      }

      try {
        const { stream, headers, status } = await server.storage.getFileStream(
          ownerId,
          resource.driveFileId,
          request.headers.range,
        );

        reply.header(
          "Content-Type",
          resource.mimeType || "application/octet-stream",
        );
        if (resource.size) {
          reply.header("Content-Length", resource.size.toString());
        }
        for (const [key, value] of Object.entries(headers)) {
          reply.header(key, value);
        }
        reply.status(status as any);

        return reply.send(stream as any);
      } catch (err: any) {
        request.log.error(err, "Failed to stream file");
        if (err.name === "StorageError") {
          return reply.status(400).send({ error: err.message } as any);
        }
        return reply.status(500).send({ error: "Failed to fetch file" } as any);
      }
    },
  );

  /**
   * @desc    Set a resource's favorite flag
   * @route   PUT /api/resources/:id/favorite
   * @access  Private
   */
  server.put(
    "/api/resources/:id/favorite",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ isFavorite: z.boolean() }),
        response: {
          200: ResourceSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { isFavorite } = request.body;
      const updated = await updateResource(request.params.id, { isFavorite });
      if (!updated) return notFoundReply(reply);

      return updated;
    },
  );

  /**
   * @desc    Record that a resource was opened, updating lastOpenedAt for the Recent feed
   * @route   POST /api/resources/:id/open
   * @access  Private
   */
  server.post(
    "/api/resources/:id/open",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: ResourceSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const resource = await updateResource(request.params.id, {
        lastOpenedAt: new Date(),
      });
      if (!resource) return notFoundReply(reply);
      return resource;
    },
  );

  /**
   * @desc    Update a resource, validating list membership and enforcing per-project title uniqueness
   * @route   PATCH /api/resources/:id
   * @access  Private
   */
  server.patch(
    "/api/resources/:id",
    {
      bodyLimit: 14 * 1024 * 1024, // 14MB limit
      schema: {
        params: z.object({ id: z.string() }),
        body: UpdateResourceSchema,
        response: {
          200: ResourceSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      const resource = await findResourceById(request.params.id);
      if (!resource) return notFoundReply(reply);

      if (body.listId) {
        // Validate the new list exists
        const list = await findListById(body.listId);
        if (!list) {
          return reply.status(404).send({ error: "Knowledge List not found" });
        }
        body.projectId = list.projectId;
      }

      // Check title uniqueness via service
      const targetProjectId = body.projectId || resource.projectId;
      const titleToCheck = body.title ?? resource.title;

      const projectChanged =
        body.projectId && body.projectId !== resource.projectId;
      const titleChanged = body.title && body.title !== resource.title;

      if (projectChanged || titleChanged) {
        const ownerId = request.ownerId;
        const exists = await isDuplicateTitle(
          targetProjectId,
          titleToCheck,
          ownerId,
          request.params.id,
        );
        if (exists) {
          return reply.status(400).send({
            error: "A resource with this name already exists in the project",
          } as any);
        }
      }

      const updatedResource = await updateResource(
        request.params.id,
        body as Record<string, unknown>,
      );

      return updatedResource;
    },
  );

  /**
   * @desc    Delete a resource, removing its Drive file when present
   * @route   DELETE /api/resources/:id
   * @access  Private
   */
  server.delete(
    "/api/resources/:id",
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
      const ownerId = request.ownerId;
      const resource = await findResourceById(request.params.id);

      if (!resource) return notFoundReply(reply);

      await server.deleter.deleteResource(request.params.id, ownerId);

      return reply.status(204).send(null);
    },
  );
};
