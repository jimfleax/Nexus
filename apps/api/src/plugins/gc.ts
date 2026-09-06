/**
 * @file gc.ts
 * @description Fastify plugin to run background garbage collection on a scheduled interval.
 * @architecture Registers background tasks in Fastify's lifecycle hooks to clean up stale resources and Drive files.
 */
import fp from "fastify-plugin";
import { runGarbageCollection } from "../gc.js";
import { FastifyInstance } from "fastify";

/**
 * @interface GCPluginOptions
 * @description Configuration options for the garbage collection plugin.
 */
interface GCPluginOptions {
  intervalMs?: number;
}

/**
 * @plugin gcPlugin
 * @description Registers the garbage collection background task.
 */
export const gcPlugin = fp(
  async (fastify: FastifyInstance, options: GCPluginOptions) => {
    const intervalMs = options.intervalMs || 15 * 60 * 1000; // 15 minutes by default

    let intervalId: NodeJS.Timeout;

    fastify.addHook("onReady", async () => {
      fastify.log.info(`Background GC scheduled every ${intervalMs}ms`);
      intervalId = setInterval(() => {
        runGarbageCollection(fastify.storage, fastify.deleter).catch((err) =>
          fastify.log.error(err, "Background GC failed"),
        );
      }, intervalMs);
    });

    fastify.addHook("onClose", async () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  },
  {
    name: "nexus-gc",
  },
);
