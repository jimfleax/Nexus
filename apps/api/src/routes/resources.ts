/**
 * @file resources.ts
 * @description Fastify plugin defining CRUD, file-upload handoff, streaming, favorite, and open-tracking routes for resources.
 * @architecture Tenant-isolated; validates with shared Zod schemas, initializes/verifies Drive resumable uploads, streams file content from Drive, and enforces uniqueness per project/title.
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { ResourceModel } from "../models/Resource.js";
import { UserModel } from "../models/User.js";
import { google } from "googleapis";
import {
  CreateResourceSchema,
  UpdateResourceSchema,
  ResourceSchema,
} from "@nexus/shared";
import { KnowledgeListModel } from "../models/KnowledgeList.js";

import { Readable } from "stream";

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
    async (request, reply) => {
      const { projectId } = request.params;
      const { listId } = request.query;
      const filter: any = { projectId };
      if (listId) {
        filter.listId = listId;
      }
      // For list views, we usually exclude the heavy 'content' field to save bandwidth
      const resources = await ResourceModel.find(filter)
        .select("-content")
        .sort({ createdAt: -1 });
      return resources;
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
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ error: "Missing file in multipart request" } as any);
        }
        body = {};
        for (const [key, field] of Object.entries(data.fields)) {
          if (field && (field as any).value !== undefined) {
             body[key] = (field as any).value;
          }
        }
        if (body.isFavorite !== undefined) {
          body.isFavorite = body.isFavorite === "true";
        }
        fileStream = data.file;
        mimeType = data.mimetype;
      } else {
        body = request.body;
      }

      const parsedBody = CreateResourceSchema.safeParse(body);
      if (!parsedBody.success) {
        return reply.status(400).send({ error: "Invalid payload: " + parsedBody.error.message } as any);
      }
      
      body = parsedBody.data;
      const ownerId = (request as any).ownerId;

      const list = await KnowledgeListModel.findOne({
        _id: body.listId,
        projectId: body.projectId,
      });
      if (!list) {
        return reply
          .status(404)
          .send({ error: "Knowledge List not found in the specified project" } as any);
      }

      const existingResource = await ResourceModel.findOne({
        projectId: body.projectId,
        title: body.title,
        ownerId,
      });
      if (existingResource) {
        return reply
          .status(400)
          .send({
            error: "A resource with this name already exists in the project",
          } as any);
      }

      let driveFileId: string | undefined;
      let size: number | undefined;

      const isFileUpload =
        (body.type === "pdf" || body.type === "image") &&
        !body.url &&
        !body.content;

      if (isFileUpload) {
        if (!fileStream) {
           return reply.status(400).send({ error: "File stream required for this resource type" } as any);
        }
        try {
          const mType = mimeType || body.mimeType || (body.type === "pdf" ? "application/pdf" : "image/jpeg");
          const uploadResult = await server.storage.uploadFile(ownerId, {
            title: body.title,
            mimeType: mType,
          }, fileStream);
          driveFileId = uploadResult.driveFileId;
          size = uploadResult.size;
        } catch (error: any) {
          request.log.error(error, "Storage upload failed");
          if (error.name === "StorageError") {
            return reply.status(400).send({ error: error.message } as any);
          }
          return reply
            .status(500)
            .send({ error: "Failed to upload file to storage" } as any);
        }
      }

      const resource = new ResourceModel({
        ...body,
        status: "ready",
        driveFileId,
        size,
      });

      await resource.save();
      return reply.status(201).send(resource);
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
      const resource = await ResourceModel.findById(request.params.id);
      if (!resource) {
        return reply.status(404).send({ error: "Resource not found" });
      }
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
      const resource = await ResourceModel.findById(request.params.id).select(
        "content type",
      );
      if (!resource) {
        return reply.status(404).send({ error: "Resource not found" });
      }

      // We can return it as raw text or markdown
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
      const ownerId = (request as any).ownerId;

      const resource = await ResourceModel.findById(id);
      if (!resource || !resource.driveFileId) {
        return reply.status(404).send({ error: "Resource or file not found" });
      }

      const user = await UserModel.findOne({ ownerId });
      if (!user || !user.driveRefreshToken) {
        return reply.status(400).send({ error: "Google Drive not configured" });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.AUTH_GOOGLE_ID,
        process.env.AUTH_GOOGLE_SECRET,
      );
      oauth2Client.setCredentials({ refresh_token: user.driveRefreshToken });

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
   * @desc    Toggle a resource's favorite flag
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
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { isFavorite } = request.body;
      const resource = await ResourceModel.findByIdAndUpdate(
        request.params.id,
        { $set: { isFavorite } },
        { new: true },
      );
      if (!resource)
        return reply.status(404).send({ error: "Resource not found" });
      return resource;
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
      const resource = await ResourceModel.findByIdAndUpdate(
        request.params.id,
        { $set: { lastOpenedAt: new Date() } },
        { new: true },
      );
      if (!resource)
        return reply.status(404).send({ error: "Resource not found" });
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

      const resource = await ResourceModel.findById(request.params.id);
      if (!resource) {
        return reply.status(404).send({ error: "Resource not found" });
      }

      if (body.listId) {
        // Need to ensure the new list exists
        const list = await KnowledgeListModel.findById(body.listId);
        if (!list) {
          return reply.status(404).send({ error: "Knowledge List not found" });
        }
        body.projectId = list.projectId;
      }

      const targetProjectId = body.projectId || resource.projectId;
      if (body.title && body.title !== resource.title) {
        const ownerId = (request as any).ownerId;
        const existingResource = await ResourceModel.findOne({
          projectId: targetProjectId,
          title: body.title,
          ownerId,
          _id: { $ne: request.params.id },
        });
        if (existingResource) {
          return reply
            .status(400)
            .send({
              error: "A resource with this name already exists in the project",
            } as any);
        }
      }

      const updatedResource = await ResourceModel.findByIdAndUpdate(
        request.params.id,
        { $set: body },
        { new: true, runValidators: true },
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
      const ownerId = (request as any).ownerId;
      const resource = await ResourceModel.findById(request.params.id);

      if (!resource) {
        return reply.status(404).send({ error: "Resource not found" });
      }

      await server.deleter.deleteResource(request.params.id, ownerId);

      return reply.status(204).send(null);
    },
  );
};
