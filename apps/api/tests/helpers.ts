/**
 * @file helpers.ts
 * @description Shared test utilities that eliminate duplicated Fastify setup, Mongo lifecycle, and auth mocking
 *              across all API test files.
 * @architecture Provides createTestApp() which builds a fully configured Fastify instance with the type
 *              provider, tenant context mock, FakeStorageAdapter, and deletion plugin — ready for route
 *              registration and app.inject() calls.
 */

import Fastify, { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDB, tenantContext } from "../src/db.js";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import { deletionPlugin } from "../src/plugins/deletion.js";

/**
 * @interface TestAppContext
 * @description Returned by createTestApp(), containing the app instance and lifecycle helpers.
 */
export interface TestAppContext {
  /** The configured Fastify instance, ready for inject() calls */
  app: FastifyInstance;
  /** The FakeStorageAdapter instance for asserting upload/delete behavior */
  fakeStorage: FakeStorageAdapter;
  /** The MongoDB memory replica set instance */
  mongoServer: MongoMemoryReplSet;
}

/**
 * @interface CreateTestAppOptions
 * @description Options for customizing the test app setup.
 */
export interface CreateTestAppOptions {
  /**
   * The owner ID used for the mock tenant context hook.
   * Defaults to "test-user-1". Can be overridden per-request
   * via the x-test-owner header.
   */
  ownerId?: string;
  /**
   * Whether to register the deletion plugin.
   * Some tests only need routes without cascade deletion. Defaults to true.
   */
  registerDeletion?: boolean;
  /**
   * Custom plugins to register after the defaults but before routes.
   * Useful for adding multipart support or custom decorations.
   */
  extraPlugins?: Array<{
    plugin: any;
    options?: any;
  }>;
  /**
   * Routes to register after all plugins are ready.
   * Each entry is a Fastify plugin (route module).
   */
  routes?: FastifyPluginAsync[];
}

/**
 * @desc    Create a fully configured Fastify test app with MongoDB, tenant context mocking,
 *          fake storage, and cascade deletion plugin. Tears down cleanly in afterAll.
 * @param   {CreateTestAppOptions} opts - Configuration options
 * @returns {Promise<TestAppContext>} The app context with inject() ready
 */
export async function createTestApp(
  opts: CreateTestAppOptions = {},
): Promise<TestAppContext> {
  const {
    ownerId = "test-user-1",
    registerDeletion = true,
    extraPlugins = [],
    routes = [],
  } = opts;

  // 1. Start in-memory MongoDB replica set (supports transactions)
  const mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  await connectDB(mongoServer.getUri());

  // 2. Build Fastify with Zod type provider
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // 2.5 Register global error handler
  const { errorHandlerPlugin } = await import("../src/plugins/errorHandler.js");
  app.register(errorHandlerPlugin);

  // 3. Register fake storage + deletion plugin
  const fakeStorage = new FakeStorageAdapter();
  app.register(storagePlugin, { adapter: fakeStorage });
  if (registerDeletion) {
    app.register(deletionPlugin);
  }

  // 4. Register extra plugins (e.g. multipart)
  for (const { plugin, options } of extraPlugins) {
    app.register(plugin, options);
  }

  // 5. Mock auth: set ownerId on request and seed tenant context.
  //    Supports per-request override via x-test-owner header for
  //    tenant isolation tests.
  app.decorateRequest("ownerId", "");
  app.addHook("onRequest", (request: any, _reply: any, done: any) => {
    const effectiveOwnerId = request.headers["x-test-owner"] || ownerId;
    request.ownerId = effectiveOwnerId;
    tenantContext.run({ ownerId: effectiveOwnerId }, () => done());
  });

  // 6. Register route plugins
  for (const route of routes) {
    app.register(route);
  }

  // 7. Ready the instance
  await app.ready();

  return { app, fakeStorage, mongoServer };
}

/**
 * @desc    Tear down the test app and disconnect from MongoDB.
 *          Call this in afterAll.
 * @param   {TestAppContext} ctx - The context returned by createTestApp()
 */
export async function teardownTestApp(ctx: TestAppContext): Promise<void> {
  await ctx.app.close();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await ctx.mongoServer.stop();
}

/**
 * @desc    Get the MongoDB URI for the test replica set.
 *          Useful for tests that need to create additional connections.
 * @param   {TestAppContext} ctx - The test app context
 * @returns {string} The MongoDB connection URI
 */
export function getMongoUri(ctx: TestAppContext): string {
  return ctx.mongoServer.getUri();
}

/**
 * @desc    Run a callback inside a tenant context for direct database operations in tests.
 *          Use this to seed data or assert database state outside of HTTP requests.
 * @param   {string} ownerId - The tenant owner ID
 * @param   {() => Promise<T>} fn - The callback to run inside the tenant context
 * @returns {Promise<T>} The callback's return value
 */
export async function inTenant<T>(
  ownerId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    tenantContext.run({ ownerId }, async () => {
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * @desc    Create a Fastify app with only the health endpoint and auth plugin,
 *          for testing auth middleware behavior without database dependencies.
 * @returns {Promise<FastifyInstance>} A minimal app for auth testing
 */
export async function createAuthTestApp(): Promise<FastifyInstance> {
  const { authPlugin } = await import("../src/auth.js");
  const app = Fastify();
  app.register(authPlugin);

  app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
  app.get("/api/protected", async (request: any) => ({
    ok: true,
    user: request.ownerId,
  }));

  await app.ready();
  return app;
}
