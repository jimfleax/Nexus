/**
 * @file index.ts
 * @description Application entry point that boots the Fastify server, connects to MongoDB, and mounts every API plugin.
 * @architecture Registers Fastify with the Zod type provider, configures the storage, deletion, and auth plugins plus all route plugins, and triggers background garbage collection on the health endpoint.
 */

import "dotenv/config";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { connectDB } from "./db.js";
import { authPlugin } from "./auth.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { listRoutes } from "./routes/lists.js";
import { resourceRoutes } from "./routes/resources.js";
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

const fastify = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
  ignoreDuplicateSlashes: true,
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(errorHandlerPlugin);
fastify.register(cookiePlugin);
// Register multipart support globally so file-upload routes can parse
// multipart/form-data requests (POST /api/resources, etc.)
fastify.register(multipart, { attachFieldsToBody: false });
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

fastify.register(oauthProviderPlugin);

// Auth routes remain public because authPlugin skips URLs beginning with /api/auth/, not because of registration order
fastify.register(authRoutes);
fastify.register(authPlugin);
fastify.register(integrationRoutes);
fastify.register(projectRoutes);
fastify.register(listRoutes);
fastify.register(resourceRoutes);
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
 * @desc    Boot the server: connect to MongoDB, then listen for HTTP traffic
 */
const start = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined");
    }
    await connectDB(mongoUri);
    fastify.log.info("Connected to MongoDB");

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
