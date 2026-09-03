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
import { buildOAuthClient } from "../utils/google/oauth.js";
import {
  CreateResourceSchema,
  UpdateResourceSchema,
  ResourceSchema,
} from "@nexus/shared";
import { Readable } from "stream";
import {
  listResourcesByProject,
  findResourceById,
  findResourceContent,
  isDuplicateTitle,
  validateListMembership,
  findListById,
  createResource,
  updateResource,
  toggleFavoriteResource,
  deleteResourceById,
} from "../services/resource.service.js";
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
        body = {};
        let fileBuffer: Buffer | null = null;

        // Iterate all parts in order. The file stream MUST be fully consumed
        // inside the loop — leaving it open stalls the iterator.
        for await (const part of request.parts()) {
          if (part.type === "file") {
            mimeType = part.mimetype;
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) {
              chunks.push(chunk as Buffer);
            }
            fileBuffer = Buffer.concat(chunks);
          } else {
            body[part.fieldname] = part.value;
          }
        }

        if (body.isFavorite !== undefined) {
          body.isFavorite = body.isFavorite === "true";
        }

        if (!fileBuffer) {
          return reply
            .status(400)
            .send({ error: "Missing file in multipart request" } as any);
        }

        // Wrap the buffer in a Readable so storage adapters receive a stream
        const { Readable } = await import("stream");
        fileStream = Readable.from(fileBuffer);
      } else {
        body = request.body;
      }

      const parsedBody = CreateResourceSchema.safeParse(body);
      if (!parsedBody.success) {
        return reply.status(400).send({
          error: "Invalid payload: " + parsedBody.error.message,
        } as any);
      }

      body = parsedBody.data;
      const ownerId = request.ownerId;

      // Validate list membership via service
      const list = await validateListMembership(body.listId, body.projectId);
      if (!list) {
        return reply.status(404).send({
          error: "Knowledge List not found in the specified project",
        } as any);
      }

      // Check title uniqueness via service
      const exists = await isDuplicateTitle(
        body.projectId,
        body.title,
        ownerId,
      );
      if (exists) {
        return reply.status(400).send({
          error: "A resource with this name already exists in the project",
        } as any);
      }

      const isFileUpload =
        (body.type === "pdf" || body.type === "image") &&
        !body.url &&
        !body.content;

      if (isFileUpload && !fileStream) {
        return reply.status(400).send({
          error: "File stream required for this resource type",
        } as any);
      }

      // Create resource via service in pending or ready state
      const resource = await createResource({
        ...body,
        status: isFileUpload ? "pending" : "ready",
      });

      if (!isFileUpload) {
        return reply.status(201).send(resource);
      }

      try {
        const mType =
          mimeType ||
          body.mimeType ||
          (body.type === "pdf" ? "application/pdf" : "image/jpeg");
        const uploadResult = await server.storage.uploadFile(
          ownerId,
          {
            title: body.title,
            mimeType: mType,
          },
          fileStream,
        );

        const updatedResource = await updateResource(resource._id.toString(), {
          driveFileId: uploadResult.driveFileId,
          size: uploadResult.size,
          status: "ready",
        });

        if (!updatedResource) {
          const finalResource = await findResourceById(resource._id.toString());
          return reply.status(201).send(finalResource);
        }

        return reply.status(201).send(updatedResource);
      } catch (error: any) {
        request.log.error(error, "Storage upload failed");

        // Remove the newly created pending resource record so retries with the same title succeed
        await deleteResourceById(resource._id.toString());

        if (error.name === "StorageError") {
          return reply.status(400).send({ error: error.message } as any);
        }
        return reply
          .status(500)
          .send({ error: "Failed to upload file to storage" } as any);
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
   * @desc    Fetch a resource's raw text/markdown content as plain text
   * @route   GET /api/v1/resources/:id/content
   * @access  Private
   */
  server.get(
    "/api/v1/resources/:id/content",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: z.string(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const resource = await findResourceContent(request.params.id);
      if (!resource) return notFoundReply(reply);

      reply.header("Content-Type", "text/plain; charset=utf-8");
      return reply.send(resource.content || "");
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

      const user = await UserModel.findOne({ ownerId });
      if (!user || !user.driveRefreshToken) {
        return reply.status(400).send({ error: "Google Drive not configured" });
      }

      const oauth2Client = buildOAuthClient(user.driveRefreshToken);

      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };

      if (request.headers.range) {
        headers["Range"] = request.headers.range;
      }

      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${resource.driveFileId}?alt=media`,
        {
          headers,
        },
      );

      if (!driveRes.ok) {
        request.log.error(`Drive API error: ${driveRes.statusText}`);
        return reply
          .status(driveRes.status as any)
          .send({ error: "Failed to fetch file from Drive" } as any);
      }

      reply.status(driveRes.status as any);

      const safeDriveHeaders = [
        "content-type",
        "content-disposition",
        "content-range",
        "accept-ranges",
      ];
      driveRes.headers.forEach((value, key) => {
        if (safeDriveHeaders.includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      });

      // Ensure proper headers for media streaming and viewing
      reply.header("Accept-Ranges", "bytes");
      if (!reply.getHeader("content-disposition")) {
        reply.header(
          "Content-Disposition",
          `inline; filename="${resource.title}"`,
        );
      }

      // Stream the response body safely by converting Web Stream to Node Stream
      return reply.send(Readable.fromWeb(driveRes.body as any) as any);
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
