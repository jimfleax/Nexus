/**
 * @file plugin.ts
 * @description Fastify plugin that decorates the server with a storage adapter.
 * @architecture Instantiates the Drive adapter from credentials (or accepts a custom adapter) and exposes it as server.storage for route handlers.
 */

import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { IStorageAdapter } from "./types.js";
import { DriveStorageAdapter } from "./drive.js";

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
      adapter = new DriveStorageAdapter(opts.clientId, opts.clientSecret);
    }
    server.decorate("storage", adapter);
  },
  { name: "storage-plugin" },
);
