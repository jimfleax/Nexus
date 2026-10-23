/**
 * @file index.ts
 * @description Application entry point that boots the Fastify server, connects to MongoDB, and mounts every API plugin.
 * @architecture Registers Fastify with the Zod type provider, configures the storage, deletion, and auth plugins plus all route plugins, and registers background garbage collection on a scheduled interval.
 */

import "dotenv/config";
import Fastify from "fastify";
import mongoose from "mongoose";
import multipart from "@fastify/multipart";
import { connectDB, disconnectDB } from "./db.js";
import { authPlugin } from "./auth.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { listRoutes } from "./routes/lists.js";
import { resourceRoutes } from "./routes/resources.js";
import { progressRoutes } from "./routes/progress.js";
import { userRoutes } from "./routes/user.js";
import { searchRoutes } from "./routes/search.js";
import { integrationRoutes } from "./routes/integrations.js";

import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

import { storagePlugin } from "./utils/storage/plugin.js";
import { deletionPlugin } from "./plugins/deletion.js";
import { errorHandlerPlugin } from "./plugins/errorHandler.js";
import { oauthProviderPlugin } from "./plugins/oauthProvider.js";

import { infoRoutes } from "./routes/info.js";

import { gcPlugin } from "./plugins/gc.js";
import cookiePlugin from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

const fastify = Fastify({
  logger: true,
  trustProxy: true,
  routerOptions: { ignoreTrailingSlash: true, ignoreDuplicateSlashes: true },
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(errorHandlerPlugin);
fastify.register(cookiePlugin);
fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (req) =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.ip ||
    "127.0.0.1",
});
// Register multipart support globally so file-upload routes can parse
// multipart/form-data requests (POST /api/resources, etc.)
fastify.register(multipart, {
  attachFieldsToBody: false,
  limits: {
    fileSize: 14 * 1024 * 1024, // 14MB limit
  },
});
fastify.register(storagePlugin, {
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
});
fastify.register(deletionPlugin);
fastify.register(gcPlugin, { intervalMs: 15 * 60 * 1000 });

// Global guardrail: Prevent edge caches (like Vercel) from aggressively caching
// any response that sets a cookie, which would strip the cookie for subsequent users.
fastify.addHook("onSend", async (_request, reply, payload) => {
  if (reply.getHeader("set-cookie")) {
    reply.header("Cache-Control", "no-store, max-age=0");
  }
  return payload;
});

// Graceful shutdown: disconnect from MongoDB when the Fastify instance closes
fastify.addHook("onClose", async () => {
  await disconnectDB();
});

fastify.register(oauthProviderPlugin);

// Auth routes remain public because authPlugin skips URLs beginning with /api/auth/, not because of registration order
fastify.register(authRoutes);
fastify.register(authPlugin);
fastify.register(integrationRoutes);
fastify.register(projectRoutes);
fastify.register(listRoutes);
fastify.register(resourceRoutes);
fastify.register(progressRoutes);
fastify.register(userRoutes);
fastify.register(searchRoutes);
fastify.register(infoRoutes);

/**
 * @desc    Liveness probe that reports API health
 * @route   GET /health
 * @access  Public
 */
fastify.get("/health", async (_request, _reply) => {
  return { ok: true, version: "0.1.0" };
});

/**
 * @desc    Test endpoint that echoes the authenticated owner's ID back to the caller
 * @route   GET /api/protected
 * @access  Private
 */
fastify.get("/api/protected", async (request, _reply) => {
  return { ok: true, user: (request as any).ownerId };
});

/**
 * @desc Ensure MongoDB connection on-demand for routes requiring database persistence.
 *       Liveness probe (/health) and OAuth redirect initiations do not block on the database.
 */
fastify.addHook("onRequest", async (request) => {
  const url = request.raw.url || request.url;
  if (
    url === "/health" ||
    url.startsWith("/api/auth/google") ||
    url.startsWith("/api/auth/github")
  ) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoose.connection.readyState !== 1) {
    await connectDB(mongoUri);
  }
});

/**
 * @desc    Initialization promise ensuring DB connection and Fastify readiness
 */
let initPromise: Promise<void> | null = null;

export const init = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      await fastify.ready();
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri) {
        connectDB(mongoUri).catch((err) => {
          fastify.log.warn(
            { err: err?.message },
            "Initial background MongoDB connection attempt deferred",
          );
        });
      }
    })();
  }
  return initPromise;
};

// Start standalone HTTP listener only when NOT running in a Vercel serverless environment
if (!process.env.VERCEL) {
  init()
    .then(async () => {
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri) {
        await connectDB(mongoUri);
        fastify.log.info("Connected to MongoDB");
      }
      const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
      await fastify.listen({ port, host: "0.0.0.0" });
      console.log(`Server listening on port ${port}`);
    })
    .catch((err) => {
      fastify.log.error(err);
      process.exit(1);
    });
}

/**
 * @desc Vercel Serverless Function entry point
 */
export default async function handler(req: any, res: any) {
  try {
    if (!req.socket) {
      req.socket = {
        remoteAddress:
          req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.headers?.["x-real-ip"] ||
          "127.0.0.1",
        encrypted: true,
      };
    } else if (!req.socket.remoteAddress) {
      req.socket.remoteAddress =
        req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers?.["x-real-ip"] ||
        "127.0.0.1";
    }
    await init();
    fastify.server.emit("request", req, res);
  } catch (err) {
    fastify.log.error(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

export { fastify };
