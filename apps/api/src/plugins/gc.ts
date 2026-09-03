import fp from "fastify-plugin";
import { runGarbageCollection } from "../gc.js";
import { FastifyInstance } from "fastify";

interface GCPluginOptions {
  intervalMs?: number;
}

export const gcPlugin = fp(
  async (fastify: FastifyInstance, options: GCPluginOptions) => {
    const intervalMs = options.intervalMs || 15 * 60 * 1000; // 15 minutes by default

    let intervalId: NodeJS.Timeout;

    fastify.addHook("onReady", async () => {
      fastify.log.info(`Background GC scheduled every ${intervalMs}ms`);
      intervalId = setInterval(() => {
        runGarbageCollection(fastify.storage).catch((err) =>
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
