import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { UpsertPdfProgressRequestSchema } from "@nexus/shared";
import { PdfProgressModel } from "../models/PdfProgress.js";

export const progressRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/progress",
    { schema: { body: UpsertPdfProgressRequestSchema } },
    async (request, reply) => {
      // In tests using `createTestApp`, request.ownerId is injected (acting as userId)
      // In production, the auth plugin sets request.ownerId or request.user.id
      const userId = (request as any).ownerId;
      const { documentUrl, currentPage, maxPageReached } = request.body;
      const lastReadAt = new Date().toISOString();

      const progress = await PdfProgressModel.findOneAndUpdate(
        { userId, documentUrl },
        {
          $set: { currentPage, lastReadAt },
          $max: { maxPageReached: maxPageReached },
        },
        { upsert: true, returnDocument: "after" },
      );

      return reply.send(progress);
    },
  );

  app.get(
    "/api/progress",
    { schema: { querystring: { documentUrl: { type: "string" } } } },
    async (request, reply) => {
      const userId = (request as any).ownerId;
      const { documentUrl } = request.query as { documentUrl: string };

      const progress = await PdfProgressModel.findOne({ userId, documentUrl });
      return reply.send(progress || null);
    },
  );
};
