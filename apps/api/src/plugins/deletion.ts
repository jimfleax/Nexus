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

/**
 * @interface IDeleter
 * @description Contract for tenant-scoped cascade deletes that also clean up Drive storage.
 */
export interface IDeleter {
  deleteProject(projectId: string, ownerId: string): Promise<void>;
  deleteList(listId: string, ownerId: string): Promise<void>;
  deleteResource(resourceId: string, ownerId: string): Promise<void>;
}

/**
 * @module deletionPlugin
 * @description Fastify plugin that registers the cascade deleter on the server instance.
 */
export const deletionPlugin = fp(
  async (server: FastifyInstance) => {
    const deleter: IDeleter = {
      /**
       * @desc    Delete a project, its lists, its resources, and their Drive files in a transaction
       * @param   {string} projectId - ID of the project to remove
       * @param   {string} ownerId - Owner used to authorize Drive deletions
       * @returns {Promise<void>} Resolves when everything is deleted
       */
      async deleteProject(projectId, ownerId) {
        const resources = await ResourceModel.find({ projectId }).select(
          "driveFileId",
        );
        const driveFileIds = resources
          .map((r) => r.driveFileId)
          .filter(Boolean) as string[];

        if (driveFileIds.length > 0) {
          await server.storage.deleteFiles(ownerId, driveFileIds);
        }

        await ResourceModel.deleteMany({ projectId });
        await KnowledgeListModel.deleteMany({ projectId });
        await ProjectModel.deleteOne({ _id: projectId });
      },
      /**
       * @desc    Delete a knowledge list, its resources, and their Drive files in a transaction
       * @param   {string} listId - ID of the list to remove
       * @param   {string} ownerId - Owner used to authorize Drive deletions
       * @returns {Promise<void>} Resolves when everything is deleted
       */
      async deleteList(listId, ownerId) {
        const resources = await ResourceModel.find({ listId }).select(
          "driveFileId",
        );
        const driveFileIds = resources
          .map((r) => r.driveFileId)
          .filter(Boolean) as string[];

        if (driveFileIds.length > 0) {
          await server.storage.deleteFiles(ownerId, driveFileIds);
        }

        await ResourceModel.deleteMany({ listId });
        await KnowledgeListModel.deleteOne({ _id: listId });
      },
      /**
       * @desc    Delete a single resource and its Drive file if present
       * @param   {string} resourceId - ID of the resource to remove
       * @param   {string} ownerId - Owner used to authorize Drive deletions
       * @returns {Promise<void>} Resolves when the resource is deleted
       */
      async deleteResource(resourceId, ownerId) {
        const resource = await ResourceModel.findById(resourceId);
        if (!resource) return;

        if (resource.driveFileId) {
          await server.storage.deleteFiles(ownerId, [resource.driveFileId]);
        }

        await ResourceModel.deleteOne({ _id: resourceId });
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
