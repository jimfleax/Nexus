/**
 * @file deletion.ts
 * @description Fastify plugin exposing atomic cascade-deletion operations for projects, lists, and resources.
 * @architecture Decorates the server with a `deleter` that removes Drive files then deletes MongoDB documents in a transaction, depending on the storage plugin.
 */

import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { ResourceModel } from "../models/Resource.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { ProjectModel } from "../models/Project.js";
import { withTransaction } from "../utils/transactions.js";

/**
 * @interface IDeleter
 * @description Contract for tenant-scoped cascade deletes that also clean up Drive storage.
 */
interface IDeleter {
  deleteProject(projectId: string, ownerId: string): Promise<void>;
  deleteList(listId: string, ownerId: string): Promise<void>;
  deleteResource(resourceId: string, ownerId: string): Promise<void>;
  processProjectDeletion(projectId: string, ownerId: string): Promise<void>;
  processListDeletion(listId: string, ownerId: string): Promise<void>;
  processResourceDeletion(resourceId: string, ownerId: string): Promise<void>;
}

/**
 * @module deletionPlugin
 * @description Fastify plugin that registers the cascade deleter on the server instance.
 */
export const deletionPlugin = fp(
  async (server: FastifyInstance) => {
    const deleter: IDeleter = {
      async deleteProject(projectId, ownerId) {
        await withTransaction(async (session) => {
          await ResourceModel.updateMany(
            { projectId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
          await KnowledgeListModel.updateMany(
            { projectId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
          await ProjectModel.updateOne(
            { _id: projectId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
        });

        // Fire and forget Phase 2
        deleter.processProjectDeletion(projectId, ownerId).catch((err) => {
          server.log.error(err, "Background project deletion failed");
        });
      },

      async deleteList(listId, ownerId) {
        await withTransaction(async (session) => {
          await ResourceModel.updateMany(
            { listId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
          await KnowledgeListModel.updateOne(
            { _id: listId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
        });

        deleter.processListDeletion(listId, ownerId).catch((err) => {
          server.log.error(err, "Background list deletion failed");
        });
      },

      async deleteResource(resourceId, ownerId) {
        await withTransaction(async (session) => {
          await ResourceModel.updateOne(
            { _id: resourceId, ownerId },
            { $set: { status: "deleting" } },
            { session },
          );
        });

        deleter.processResourceDeletion(resourceId, ownerId).catch((err) => {
          server.log.error(err, "Background resource deletion failed");
        });
      },

      async processProjectDeletion(projectId, ownerId) {
        const resources = await ResourceModel.find(
          { projectId, ownerId, status: "deleting" },
          null,
          { skipTenant: true },
        ).select("driveFileId");

        const driveFileIds = resources
          .map((r) => r.driveFileId)
          .filter(Boolean) as string[];

        if (driveFileIds.length > 0) {
          await server.storage.deleteFiles(ownerId, driveFileIds);
        }

        await withTransaction(async (session) => {
          await ResourceModel.deleteMany(
            { projectId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
          await KnowledgeListModel.deleteMany(
            { projectId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
          await ProjectModel.deleteOne(
            { _id: projectId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
        });
      },

      async processListDeletion(listId, ownerId) {
        const resources = await ResourceModel.find(
          { listId, ownerId, status: "deleting" },
          null,
          { skipTenant: true },
        ).select("driveFileId");

        const driveFileIds = resources
          .map((r) => r.driveFileId)
          .filter(Boolean) as string[];

        if (driveFileIds.length > 0) {
          await server.storage.deleteFiles(ownerId, driveFileIds);
        }

        await withTransaction(async (session) => {
          await ResourceModel.deleteMany(
            { listId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
          await KnowledgeListModel.deleteOne(
            { _id: listId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
        });
      },

      async processResourceDeletion(resourceId, ownerId) {
        const resource = await ResourceModel.findOne(
          { _id: resourceId, ownerId, status: "deleting" },
          null,
          { skipTenant: true },
        );
        if (!resource) return;

        if (resource.driveFileId) {
          await server.storage.deleteFiles(ownerId, [resource.driveFileId]);
        }

        await withTransaction(async (session) => {
          await ResourceModel.deleteOne(
            { _id: resourceId, ownerId, status: "deleting" },
            { session, skipTenant: true },
          );
        });
      },
    };
    server.decorate("deleter", deleter);
  },
  { name: "deletion-plugin", dependencies: ["storage-plugin"] },
);

declare module "fastify" {
  interface FastifyInstance {
    deleter: IDeleter;
  }
}
