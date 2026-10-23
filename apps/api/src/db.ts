/**
 * @file db.ts
 * @description Database bootstrap with connection caching, 3-retry exponential backoff mechanism, robust error handling, and the tenant-isolation Mongoose plugin.
 * @architecture Exposes an AsyncLocalStorage tenant context, connection pooling and caching strategy on globalThis, and a Mongoose plugin scoping every query and write to the authenticated owner.
 */

import mongoose from "mongoose";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * @constant {AsyncLocalStorage<{ ownerId: string }>} tenantContext
 * @description Async-local store that carries the authenticated ownerId through the request lifecycle for tenant scoping.
 */
export const tenantContext = new AsyncLocalStorage<{ ownerId: string }>();

/**
 * @interface MongooseCache
 * @description Internal structure storing active connection and in-flight connection promise.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __nexusMongooseCache: MongooseCache | undefined;
}

const getCache = (): MongooseCache => {
  if (!globalThis.__nexusMongooseCache) {
    globalThis.__nexusMongooseCache = { conn: null, promise: null };
  }
  return globalThis.__nexusMongooseCache;
};

/**
 * @class DatabaseConnectionError
 * @description Custom error containing connection attempt metadata and sanitized connection details.
 */
export class DatabaseConnectionError extends Error {
  public readonly attempts: number;
  public readonly originalError?: Error;
  public readonly sanitizedUri?: string;

  constructor(
    message: string,
    options?: { cause?: unknown; attempts?: number; uri?: string },
  ) {
    super(message);
    this.name = "DatabaseConnectionError";
    this.attempts = options?.attempts ?? 0;
    this.originalError =
      options?.cause instanceof Error ? options.cause : undefined;
    this.sanitizedUri = options?.uri;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }
}

/**
 * @desc    Mask credentials in a MongoDB connection string for safe logging and error reporting
 * @param   {string} [uri] - MongoDB connection string
 * @returns {string} Sanitized connection string with password obscured
 */
export function maskMongoUri(uri?: string): string {
  if (!uri || typeof uri !== "string") return "";
  try {
    return uri.replace(/\/\/(.*?)@/, (_match, credentials) => {
      const parts = credentials.split(":");
      if (parts.length >= 2) {
        return `//${parts[0]}:****@`;
      }
      return `//****@`;
    });
  } catch {
    return "mongodb://[masked]";
  }
}

/**
 * @interface ConnectDBOptions
 * @description Configuration options for MongoDB connection establishment and retries.
 */
export interface ConnectDBOptions {
  /** Maximum number of connection attempts (default: 3) */
  retries?: number;
  /** Initial backoff delay in milliseconds (default: 1000) */
  initialBackoffMs?: number;
  /** Maximum backoff delay in milliseconds (default: 5000) */
  maxBackoffMs?: number;
  /** Additional Mongoose ConnectOptions */
  mongooseOptions?: mongoose.ConnectOptions;
  /** Optional custom logger */
  logger?: {
    info?: (msg: string) => void;
    warn?: (msg: string) => void;
    error?: (msg: string | Error, ...args: any[]) => void;
  };
}

let listenersAttached = false;
let activeLogger: {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string | Error, ...args: any[]) => void;
} = console;

function setupConnectionListeners(logger: {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string | Error, ...args: any[]) => void;
}) {
  activeLogger = logger;
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => {
    activeLogger.info?.("[MongoDB] Connection established successfully.");
  });

  mongoose.connection.on("error", (err) => {
    activeLogger.error?.("[MongoDB] Runtime connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    activeLogger.warn?.("[MongoDB] Connection lost / disconnected.");
    const cache = getCache();
    cache.conn = null;
    cache.promise = null;
  });
}

/**
 * @desc    Establish or reuse a MongoDB connection using Mongoose with connection caching and a 3-retry mechanism
 * @param   {string} [uri] - MongoDB connection string (defaults to process.env.MONGODB_URI)
 * @param   {ConnectDBOptions | number} [optionsOrRetries=3] - Connection options or retry count
 * @returns {Promise<typeof mongoose>} Resolves with the Mongoose instance once connected
 */
export const connectDB = async (
  uri?: string,
  optionsOrRetries: ConnectDBOptions | number = 3,
): Promise<typeof mongoose> => {
  const options: ConnectDBOptions =
    typeof optionsOrRetries === "number"
      ? { retries: optionsOrRetries }
      : optionsOrRetries || {};

  const targetUri = uri || process.env.MONGODB_URI;

  if (!targetUri || typeof targetUri !== "string" || targetUri.trim() === "") {
    throw new DatabaseConnectionError(
      "MongoDB URI is required. Provide a valid connection string or set MONGODB_URI.",
      { attempts: 0, uri: "" },
    );
  }

  const cache = getCache();
  const logger = options.logger ?? {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg, ...args) => console.error(msg, ...args),
  };

  // 1. If an active connection exists, reuse it immediately without reconnecting
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cache.conn = mongoose;
    return mongoose;
  }

  // 2. If a connection attempt is already in-flight, reuse the pending promise
  if (cache.promise && mongoose.connection.readyState === 2) {
    return cache.promise;
  }

  if (cache.promise) {
    return cache.promise;
  }

  // 3. Initiate connection with retry mechanism
  const retries = options.retries ?? 3;
  const initialBackoffMs = options.initialBackoffMs ?? 1000;
  const maxBackoffMs = options.maxBackoffMs ?? 5000;

  setupConnectionListeners(logger);

  cache.promise = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const defaultOptions: mongoose.ConnectOptions = {
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          ...options.mongooseOptions,
        };

        await mongoose.connect(targetUri, defaultOptions);
        cache.conn = mongoose;
        return mongoose;
      } catch (err) {
        lastError = err;
        cache.conn = null;

        if (attempt < retries) {
          const delay = Math.min(
            initialBackoffMs * 2 ** (attempt - 1),
            maxBackoffMs,
          );
          logger.warn?.(
            `[MongoDB] Connection attempt ${attempt}/${retries} failed: ${(err as Error)?.message || String(err)}. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error?.(
            `[MongoDB] Connection failed after ${retries} attempts: ${(err as Error)?.message || String(err)}`,
          );
        }
      }
    }

    cache.promise = null;
    throw new DatabaseConnectionError(
      `Failed to connect to MongoDB after ${retries} attempts. Cause: ${(lastError as Error)?.message || String(lastError)}`,
      {
        cause: lastError,
        attempts: retries,
        uri: maskMongoUri(targetUri),
      },
    );
  })();

  try {
    return await cache.promise;
  } catch (error) {
    cache.promise = null;
    cache.conn = null;
    throw error;
  }
};

/**
 * @desc    Gracefully close the Mongoose connection and clear cached instances
 * @returns {Promise<void>}
 */
export const disconnectDB = async (): Promise<void> => {
  const cache = getCache();
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } finally {
    cache.conn = null;
    cache.promise = null;
  }
};

export type ConnectionStateName =
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "uninitialized";

/**
 * @desc    Get current database connection status and readyState
 * @returns {{ isConnected: boolean; readyState: number; statusName: ConnectionStateName }}
 */
export function getDatabaseStatus(): {
  isConnected: boolean;
  readyState: number;
  statusName: ConnectionStateName;
} {
  const state = mongoose.connection.readyState;
  const stateMap: Record<number, ConnectionStateName> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };
  return {
    isConnected: state === 1,
    readyState: state,
    statusName: stateMap[state] ?? "disconnected",
  };
}

/**
 * @desc    Internal helper to clear connection cache for test isolation
 */
export function _resetConnectionCacheForTesting(): void {
  const cache = getCache();
  cache.conn = null;
  cache.promise = null;
}

/**
 * @desc    Mongoose plugin factory that enforces per-owner data isolation on queries, aggregates, and saves
 * @param   {mongoose.Schema} schema - The Mongoose schema to harden for multi-tenancy
 */
export function tenantIsolationPlugin(schema: mongoose.Schema) {
  // Ensure the schema has an ownerId field
  if (!schema.path("ownerId")) {
    schema.add({ ownerId: { type: String, required: true, index: true } });
  }

  const hasStatus = !!schema.path("status");

  const injectTenant = function (this: mongoose.Query<any, any>) {
    if (this.getOptions().skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error(
        "Tenant context missing. Set skipTenant: true to bypass.",
      );
    }

    const criteria: any = { ownerId: store.ownerId };
    if (hasStatus) {
      criteria.status = { $ne: "deleting" };
    }
    this.where(criteria);
  };

  const queryMethods = [
    "countDocuments",
    "deleteMany",
    "deleteOne",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndReplace",
    "findOneAndUpdate",
    "replaceOne",
    "updateMany",
    "updateOne",
  ];

  queryMethods.forEach((method) => {
    schema.pre(method as any, injectTenant);
  });

  schema.pre("aggregate", function () {
    if (this.options && this.options.skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error(
        "Tenant context missing. Set skipTenant: true to bypass.",
      );
    }

    const match: any = { ownerId: store.ownerId };
    if (hasStatus) {
      match.status = { $ne: "deleting" };
    }

    this.pipeline().unshift({ $match: match });
  });

  const injectTenantOnSave = function (this: any) {
    if (this.$locals?.skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error("Tenant context missing on save.");
    }

    if (!this.ownerId) {
      this.ownerId = store.ownerId;
    } else if (this.ownerId !== store.ownerId) {
      throw new Error("Tenant context mismatch on save.");
    }
  };

  schema.pre("validate", injectTenantOnSave);
  schema.pre("save", injectTenantOnSave);
}
