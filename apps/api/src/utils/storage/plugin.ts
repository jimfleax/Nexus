/**
 * @file plugin.ts
 * @description Fastify plugin that decorates the server with a storage adapter.
 * @architecture Instantiates the Drive adapter from credentials (or accepts a custom adapter) and exposes it as server.storage for route handlers.
 */

import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { IStorageAdapter, IDriveCredentialProvider } from "./types.js";
import { DriveStorageAdapter } from "./drive.js";
import { buildGoogleAuthClient } from "../oauth/google.js";
import { UserModel } from "../../models/User.js";

declare module "fastify" {
  interface FastifyInstance {
    storage: IStorageAdapter;
  }
}

/**
 * @interface StoragePluginOptions
 * @description Plugin options for selecting the storage backend.
 */
export interface StoragePluginOptions {
  clientId?: string;
  clientSecret?: string;
  adapter?: IStorageAdapter;
}

/**
 * @module storagePlugin
 * @description Fastify plugin that registers the storage adapter on the server instance.
 */
export const storagePlugin = fp(
  async (server: FastifyInstance, opts: StoragePluginOptions) => {
    let adapter = opts.adapter;
    if (!adapter) {
      if (!opts.clientId || !opts.clientSecret) {
        throw new Error(
          "StoragePlugin requires either an adapter or clientId and clientSecret",
        );
      }
      const credentialProvider: IDriveCredentialProvider = {
        async getCredentials(ownerId: string) {
          const user = await UserModel.findOne({ ownerId }).select(
            "driveRefreshToken driveFolderId",
          );
          if (!user || !user.driveRefreshToken) return null;
          return {
            refreshToken: user.driveRefreshToken,
            folderId: user.driveFolderId,
          };
        },
        async saveFolderId(ownerId: string, folderId: string) {
          await UserModel.updateOne(
            { ownerId },
            { $set: { driveFolderId: folderId } },
          );
        },
      };
      adapter = new DriveStorageAdapter(
        opts.clientId,
        opts.clientSecret,
        credentialProvider,
        (refreshToken) =>
          buildGoogleAuthClient(refreshToken, {
            clientId: opts.clientId as string,
            clientSecret: opts.clientSecret as string,
          }),
      );
    }
    server.decorate("storage", adapter);
  },
  { name: "storage-plugin" },
);
