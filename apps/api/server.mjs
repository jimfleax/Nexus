var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) =>
  typeof require !== "undefined"
    ? require
    : typeof Proxy !== "undefined"
      ? new Proxy(x, {
          get: (a, b) => (typeof require !== "undefined" ? require : a)[b],
        })
      : x)(function (x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) =>
  function __init() {
    if (err) throw err[0];
    try {
      return (fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res);
    } catch (e) {
      throw ((err = [e]), e);
    }
  };
var __commonJS = (cb, mod) =>
  function __require2() {
    try {
      return (
        mod ||
          (0, cb[__getOwnPropNames(cb)[0]])(
            (mod = { exports: {} }).exports,
            mod,
          ),
        mod.exports
      );
    } catch (e) {
      throw ((mod = 0), e);
    }
  };
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);

// src/utils/crypto.ts
import crypto from "crypto";
function getKey(password, salt) {
  return crypto.scryptSync(password, salt, KEY_LENGTH);
}
function encrypt(text) {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be defined in the environment");
  }
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey(process.env.TOKEN_ENCRYPTION_KEY, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}
function decrypt(encData) {
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be defined in the environment");
  }
  const data = Buffer.from(encData, "base64");
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
  );
  const text = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = getKey(process.env.TOKEN_ENCRYPTION_KEY, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(text) + decipher.final("utf8");
}
var ALGORITHM, IV_LENGTH, SALT_LENGTH, TAG_LENGTH, KEY_LENGTH;
var init_crypto = __esm({
  "src/utils/crypto.ts"() {
    "use strict";
    ALGORITHM = "aes-256-gcm";
    IV_LENGTH = 16;
    SALT_LENGTH = 64;
    TAG_LENGTH = 16;
    KEY_LENGTH = 32;
  },
});

// src/models/User.ts
var User_exports = {};
__export(User_exports, {
  UserModel: () => UserModel,
});
import mongoose2, { Schema } from "mongoose";
var UserSchema, UserModel;
var init_User = __esm({
  "src/models/User.ts"() {
    "use strict";
    init_crypto();
    UserSchema = new Schema(
      {
        ownerId: { type: String, required: true, unique: true },
        /**
         * @field driveRefreshToken
         * @description Encrypted refresh token for Google Drive integration. Getters/setters automatically handle encryption, falling back for legacy unencrypted tokens.
         */
        driveRefreshToken: {
          type: String,
          get: (val) => {
            if (!val) return val;
            try {
              return decrypt(val);
            } catch (err) {
              if (
                err.message ===
                "TOKEN_ENCRYPTION_KEY must be defined in the environment"
              ) {
                throw err;
              }
              return val;
            }
          },
          set: (val) => {
            if (!val) return val;
            try {
              return encrypt(val);
            } catch (err) {
              if (
                err.message ===
                "TOKEN_ENCRYPTION_KEY must be defined in the environment"
              ) {
                throw err;
              }
              return val;
            }
          },
        },
        driveFolderId: { type: String },
      },
      {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true },
      },
    );
    UserModel = mongoose2.models.User || mongoose2.model("User", UserSchema);
  },
});

// ../../packages/shared/dist/schemas/project.js
var require_project = __commonJS({
  "../../packages/shared/dist/schemas/project.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProjectSchema =
      exports.UpdateProjectSchema =
      exports.CreateProjectSchema =
        void 0;
    var zod_1 = __require("zod");
    exports.CreateProjectSchema = zod_1.z.object({
      name: zod_1.z.string().min(1, "Name is required").max(100),
      description: zod_1.z.string().max(500).optional(),
      icon: zod_1.z.string().optional(),
    });
    exports.UpdateProjectSchema = exports.CreateProjectSchema.partial();
    exports.ProjectSchema = zod_1.z.object({
      id: zod_1.z.string(),
      name: zod_1.z.string(),
      description: zod_1.z.string().optional(),
      icon: zod_1.z.string().optional(),
      slug: zod_1.z.string(),
      listCount: zod_1.z.number().optional().default(0),
      status: zod_1.z.enum(["active", "deleting"]).default("active"),
      createdAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
      updatedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    });
  },
});

// ../../packages/shared/dist/schemas/knowledge-list.js
var require_knowledge_list = __commonJS({
  "../../packages/shared/dist/schemas/knowledge-list.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KnowledgeListSchema =
      exports.ReorderKnowledgeListSchema =
      exports.UpdateKnowledgeListSchema =
      exports.CreateKnowledgeListSchema =
        void 0;
    var zod_1 = __require("zod");
    exports.CreateKnowledgeListSchema = zod_1.z.object({
      projectId: zod_1.z.string(),
      name: zod_1.z.string().min(1, "Name is required").max(100),
      description: zod_1.z.string().max(500).optional(),
    });
    exports.UpdateKnowledgeListSchema = zod_1.z.object({
      name: zod_1.z.string().min(1, "Name is required").max(100).optional(),
      description: zod_1.z.string().max(500).optional(),
    });
    exports.ReorderKnowledgeListSchema = zod_1.z.object({
      items: zod_1.z.array(
        zod_1.z.object({
          id: zod_1.z.string(),
          position: zod_1.z.number(),
        }),
      ),
    });
    exports.KnowledgeListSchema = zod_1.z.object({
      id: zod_1.z.string(),
      projectId: zod_1.z.string(),
      name: zod_1.z.string(),
      slug: zod_1.z.string(),
      description: zod_1.z.string().optional(),
      position: zod_1.z.number(),
      status: zod_1.z.enum(["active", "deleting"]).default("active"),
      createdAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
      updatedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    });
  },
});

// ../../packages/shared/dist/schemas/resource.js
var require_resource = __commonJS({
  "../../packages/shared/dist/schemas/resource.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResourceSchema =
      exports.ResourceAiSchema =
      exports.ResourceStatusSchema =
      exports.UpdateResourceSchema =
      exports.CreateResourceSchema =
      exports.ResourceTypeSchema =
        void 0;
    var zod_1 = __require("zod");
    exports.ResourceTypeSchema = zod_1.z.enum([
      "markdown",
      "pdf",
      "image",
      "ebook",
      "text",
      "url",
      "note",
      "chat",
    ]);
    exports.CreateResourceSchema = zod_1.z.object({
      projectId: zod_1.z.string(),
      listId: zod_1.z.string(),
      title: zod_1.z.string().min(1, "Title is required").max(200),
      type: exports.ResourceTypeSchema,
      mimeType: zod_1.z.string().optional(),
      description: zod_1.z.string().max(1e3).optional(),
      url: zod_1.z.string().url().optional(),
      size: zod_1.z.number().optional(),
      tags: zod_1.z.array(zod_1.z.string()).default([]),
      isFavorite: zod_1.z.boolean().default(false),
    });
    exports.UpdateResourceSchema = zod_1.z.object({
      title: zod_1.z.string().min(1, "Title is required").max(200).optional(),
      listId: zod_1.z.string().optional(),
      projectId: zod_1.z.string().optional(),
      type: exports.ResourceTypeSchema.optional(),
      mimeType: zod_1.z.string().optional(),
      description: zod_1.z.string().max(1e3).optional(),
      url: zod_1.z.string().url().optional(),
      size: zod_1.z.number().optional(),
      tags: zod_1.z.array(zod_1.z.string()).optional(),
      isFavorite: zod_1.z.boolean().optional(),
    });
    exports.ResourceStatusSchema = zod_1.z.enum([
      "pending",
      "ready",
      "error",
      "deleting",
    ]);
    exports.ResourceAiSchema = zod_1.z.object({
      summary: zod_1.z.string().optional(),
      shortSummary: zod_1.z.string().optional(),
      topics: zod_1.z.array(zod_1.z.string()).optional(),
      tags: zod_1.z.array(zod_1.z.string()).optional(),
      entities: zod_1.z
        .array(
          zod_1.z.object({
            name: zod_1.z.string(),
            type: zod_1.z.string(),
          }),
        )
        .optional(),
      keyPoints: zod_1.z.array(zod_1.z.string()).optional(),
      keywords: zod_1.z.array(zod_1.z.string()).optional(),
      language: zod_1.z.string().optional(),
      sentiment: zod_1.z.string().optional(),
      difficulty: zod_1.z
        .enum(["beginner", "intermediate", "advanced"])
        .optional(),
      contentType: zod_1.z.string().optional(),
      processedAt: zod_1.z.string().or(zod_1.z.date()).optional(),
      model: zod_1.z.string().optional(),
      version: zod_1.z.string().optional(),
    });
    exports.ResourceSchema = zod_1.z.object({
      id: zod_1.z.string(),
      projectId: zod_1.z.string(),
      listId: zod_1.z.string(),
      title: zod_1.z.string(),
      type: exports.ResourceTypeSchema,
      mimeType: zod_1.z.string().optional(),
      description: zod_1.z.string().optional(),
      url: zod_1.z.string().optional(),
      size: zod_1.z.number().optional(),
      tags: zod_1.z.array(zod_1.z.string()),
      isFavorite: zod_1.z.boolean(),
      status: exports.ResourceStatusSchema.default("ready"),
      checksum: zod_1.z.string().optional(),
      uploadUri: zod_1.z.string().optional(),
      driveFileId: zod_1.z.string().optional(),
      lastOpenedAt: zod_1.z.string().or(zod_1.z.date()).optional(),
      createdAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
      updatedAt: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
      readingTime: zod_1.z.string().optional(),
      ai: exports.ResourceAiSchema.optional(),
    });
  },
});

// ../../packages/shared/dist/schemas/user.js
var require_user = __commonJS({
  "../../packages/shared/dist/schemas/user.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UserMetricsSchema =
      exports.DriveMetricsSchema =
      exports.UpdateUserSettingsSchema =
      exports.UserSettingsSchema =
        void 0;
    var zod_1 = __require("zod");
    exports.UserSettingsSchema = zod_1.z.object({
      driveRefreshToken: zod_1.z.string().nullable().optional(),
    });
    exports.UpdateUserSettingsSchema = zod_1.z.object({
      driveRefreshToken: zod_1.z.string().nullable().optional(),
    });
    exports.DriveMetricsSchema = zod_1.z.object({
      connected: zod_1.z.boolean(),
      usedInDrive: zod_1.z.number().nullable(),
      limit: zod_1.z.number().nullable(),
      remaining: zod_1.z.number().nullable(),
    });
    exports.UserMetricsSchema = zod_1.z.object({
      usedByNexus: zod_1.z.number(),
      resourceCount: zod_1.z.number(),
      projectCount: zod_1.z.number(),
      listCount: zod_1.z.number(),
      byType: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
      drive: exports.DriveMetricsSchema,
    });
  },
});

// ../../packages/shared/dist/schemas/info.js
var require_info = __commonJS({
  "../../packages/shared/dist/schemas/info.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InfoSchema = void 0;
    var zod_1 = __require("zod");
    exports.InfoSchema = zod_1.z.object({
      id: zod_1.z.string(),
      type: zod_1.z.enum(["project", "list", "resource"]),
      name: zod_1.z.string(),
      description: zod_1.z.string().optional(),
      createdAt: zod_1.z.string().or(zod_1.z.date()),
      updatedAt: zod_1.z.string().or(zod_1.z.date()),
      listCount: zod_1.z.number().optional(),
      resourceCount: zod_1.z.number().optional(),
      resourceType: zod_1.z.string().optional(),
      mimeType: zod_1.z.string().optional(),
      size: zod_1.z.number().optional(),
      status: zod_1.z.string().optional(),
      readingTime: zod_1.z.string().optional(),
    });
  },
});

// ../../packages/shared/dist/schemas/error.js
var require_error = __commonJS({
  "../../packages/shared/dist/schemas/error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ErrorResponseSchema = void 0;
    var zod_1 = __require("zod");
    exports.ErrorResponseSchema = zod_1.z.object({
      ok: zod_1.z.literal(false),
      error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
      }),
    });
  },
});

// ../../packages/shared/dist/schemas/utils.js
var require_utils = __commonJS({
  "../../packages/shared/dist/schemas/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.safeArrayResponse = safeArrayResponse6;
    var zod_1 = __require("zod");
    function safeArrayResponse6(schema) {
      return zod_1.z.array(zod_1.z.unknown()).transform((arr) => {
        return arr.reduce((acc, item) => {
          const result = schema.safeParse(item);
          if (result.success) {
            acc.push(result.data);
          } else {
            console.error("[SafeArrayResponse] Filtered corrupt item:", item);
            console.error(
              "[SafeArrayResponse] Validation errors:",
              result.error,
            );
          }
          return acc;
        }, []);
      });
    }
  },
});

// ../../packages/shared/dist/schemas/pdf-progress.js
var require_pdf_progress = __commonJS({
  "../../packages/shared/dist/schemas/pdf-progress.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UpsertPdfProgressRequestSchema = exports.PdfProgressSchema = void 0;
    var zod_1 = __require("zod");
    exports.PdfProgressSchema = zod_1.z.object({
      userId: zod_1.z.string(),
      documentUrl: zod_1.z.string(),
      currentPage: zod_1.z.number().min(1),
      maxPageReached: zod_1.z.number().min(1),
      lastReadAt: zod_1.z.string().datetime(),
    });
    exports.UpsertPdfProgressRequestSchema = zod_1.z.object({
      documentUrl: zod_1.z.string(),
      currentPage: zod_1.z.number().min(1),
      maxPageReached: zod_1.z.number().min(1),
    });
  },
});

// ../../packages/shared/dist/index.js
var require_dist = __commonJS({
  "../../packages/shared/dist/index.js"(exports) {
    "use strict";
    var __createBinding =
      (exports && exports.__createBinding) ||
      (Object.create
        ? function (o, m, k, k2) {
            if (k2 === void 0) k2 = k;
            var desc = Object.getOwnPropertyDescriptor(m, k);
            if (
              !desc ||
              ("get" in desc
                ? !m.__esModule
                : desc.writable || desc.configurable)
            ) {
              desc = {
                enumerable: true,
                get: function () {
                  return m[k];
                },
              };
            }
            Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
            if (k2 === void 0) k2 = k;
            o[k2] = m[k];
          });
    var __exportStar =
      (exports && exports.__exportStar) ||
      function (m, exports2) {
        for (var p in m)
          if (
            p !== "default" &&
            !Object.prototype.hasOwnProperty.call(exports2, p)
          )
            __createBinding(exports2, m, p);
      };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_project(), exports);
    __exportStar(require_knowledge_list(), exports);
    __exportStar(require_resource(), exports);
    __exportStar(require_user(), exports);
    __exportStar(require_info(), exports);
    __exportStar(require_error(), exports);
    __exportStar(require_utils(), exports);
    __exportStar(require_pdf_progress(), exports);
  },
});

// src/index.ts
import "dotenv/config";
import Fastify from "fastify";
import multipart from "@fastify/multipart";

// src/db.ts
import mongoose from "mongoose";
import { AsyncLocalStorage } from "node:async_hooks";
var tenantContext = new AsyncLocalStorage();
var getCache = () => {
  if (!globalThis.__nexusMongooseCache) {
    globalThis.__nexusMongooseCache = { conn: null, promise: null };
  }
  return globalThis.__nexusMongooseCache;
};
var DatabaseConnectionError = class _DatabaseConnectionError extends Error {
  attempts;
  originalError;
  sanitizedUri;
  constructor(message, options) {
    super(message);
    this.name = "DatabaseConnectionError";
    this.attempts = options?.attempts ?? 0;
    this.originalError =
      options?.cause instanceof Error ? options.cause : void 0;
    this.sanitizedUri = options?.uri;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, _DatabaseConnectionError.prototype);
  }
};
function maskMongoUri(uri) {
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
var listenersAttached = false;
var activeLogger = console;
function setupConnectionListeners(logger) {
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
var connectDB = async (uri, optionsOrRetries = 3) => {
  const options =
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
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }
  if (mongoose.connection.readyState === 1) {
    cache.conn = mongoose;
    return mongoose;
  }
  if (cache.promise && mongoose.connection.readyState === 2) {
    return cache.promise;
  }
  if (cache.promise) {
    return cache.promise;
  }
  const retries = options.retries ?? 3;
  const initialBackoffMs = options.initialBackoffMs ?? 1e3;
  const maxBackoffMs = options.maxBackoffMs ?? 5e3;
  setupConnectionListeners(logger);
  cache.promise = (async () => {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const defaultOptions = {
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5e3,
          socketTimeoutMS: 45e3,
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
            `[MongoDB] Connection attempt ${attempt}/${retries} failed: ${err?.message || String(err)}. Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error?.(
            `[MongoDB] Connection failed after ${retries} attempts: ${err?.message || String(err)}`,
          );
        }
      }
    }
    cache.promise = null;
    throw new DatabaseConnectionError(
      `Failed to connect to MongoDB after ${retries} attempts. Cause: ${lastError?.message || String(lastError)}`,
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
var disconnectDB = async () => {
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
function tenantIsolationPlugin(schema) {
  if (!schema.path("ownerId")) {
    schema.add({ ownerId: { type: String, required: true, index: true } });
  }
  const hasStatus = !!schema.path("status");
  const injectTenant = function () {
    if (this.getOptions().skipTenant) {
      return;
    }
    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error(
        "Tenant context missing. Set skipTenant: true to bypass.",
      );
    }
    const criteria = { ownerId: store.ownerId };
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
    schema.pre(method, injectTenant);
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
    const match = { ownerId: store.ownerId };
    if (hasStatus) {
      match.status = { $ne: "deleting" };
    }
    this.pipeline().unshift({ $match: match });
  });
  const injectTenantOnSave = function () {
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

// src/auth.ts
import fp from "fastify-plugin";
import { jwtVerify } from "jose";

// src/utils/session.ts
var OAUTH_STATE_COOKIE = "oauth_state";
var INTEGRATION_STATE_COOKIE = "integration_state";
var SESSION_COOKIE = "nexus-session";
function getCookieOptions() {
  const apiUrl2 =
    process.env.API_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:8080");
  return {
    httpOnly: true,
    secure:
      apiUrl2.startsWith("https://") || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}
var SessionManager = {
  /**
   * @desc Extracts the authentication token from the request headers, cookies, or query parameters.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The extracted token or null if not found.
   */
  getAuthToken(request) {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    if (request.cookies && request.cookies[SESSION_COOKIE]) {
      return request.cookies[SESSION_COOKIE];
    }
    const query = request.query;
    if (query && query.token) {
      return query.token;
    }
    return null;
  },
  /**
   * @desc Sets the OAuth state cookie in the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @param {string} state - The OAuth state string to set.
   * @returns {void}
   */
  setOAuthState(reply, state) {
    reply.cookie(OAUTH_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },
  /**
   * @desc Retrieves the OAuth state from the request cookies.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The OAuth state or null if not found.
   */
  getOAuthState(request) {
    return request.cookies ? request.cookies[OAUTH_STATE_COOKIE] || null : null;
  },
  /**
   * @desc Clears the OAuth state cookie from the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @returns {void}
   */
  clearOAuthState(reply) {
    reply.clearCookie(OAUTH_STATE_COOKIE, getCookieOptions());
  },
  /**
   * @desc Sets the integration state cookie in the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @param {string} state - The integration state string to set.
   * @returns {void}
   */
  setIntegrationState(reply, state) {
    reply.cookie(INTEGRATION_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },
  /**
   * @desc Retrieves the integration state from the request cookies.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The integration state or null if not found.
   */
  getIntegrationState(request) {
    return request.cookies
      ? request.cookies[INTEGRATION_STATE_COOKIE] || null
      : null;
  },
  /**
   * @desc Clears the integration state cookie from the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @returns {void}
   */
  clearIntegrationState(reply) {
    reply.clearCookie(INTEGRATION_STATE_COOKIE, getCookieOptions());
  },
};

// src/types.ts
import "fastify";

// src/auth.ts
async function verifyToken(token, secret) {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { clockTolerance: 30 });
  return payload;
}
var authPlugin = fp(async (fastify2) => {
  fastify2.decorateRequest("ownerId", "");
  fastify2.addHook("onRequest", (request, reply, done) => {
    tenantContext.run({ ownerId: "" }, () => {
      done();
    });
  });
  fastify2.addHook("preHandler", async (request, reply) => {
    const rawUrl = request.url.split("?")[0].replace(/\/\/+/g, "/");
    const routeUrl = request.routeOptions?.url || rawUrl;
    if (
      routeUrl === "/health" ||
      routeUrl.startsWith("/api/auth/") ||
      routeUrl === "/api/integrations/google-drive/callback"
    ) {
      return;
    }
    const token = SessionManager.getAuthToken(request);
    if (!token) {
      return reply
        .status(401)
        .send({ error: "Unauthorized: Missing or invalid token" });
    }
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      request.log.error("AUTH_SECRET is not configured.");
      return reply.status(500).send({ error: "Internal Server Error" });
    }
    try {
      const payload = await verifyToken(token, secret);
      const ownerId = payload.sub;
      if (!ownerId) {
        return reply
          .status(401)
          .send({ error: "Unauthorized: Missing sub in token" });
      }
      request.ownerId = ownerId;
      const store = tenantContext.getStore();
      if (store) {
        store.ownerId = ownerId;
      }
    } catch (err) {
      request.log.error(err, "Token validation failed");
      return reply.status(401).send({ error: "Unauthorized: Invalid token" });
    }
  });
});

// src/routes/auth.ts
import fp2 from "fastify-plugin";
import { SignJWT } from "jose";

// src/services/user.service.ts
init_User();

// src/models/Resource.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var ResourceSchema = new Schema2(
  {
    projectId: { type: String, required: true, index: true },
    listId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "markdown",
        "pdf",
        "image",
        "ebook",
        "text",
        "url",
        "note",
        "chat",
      ],
    },
    mimeType: { type: String },
    description: { type: String },
    url: { type: String },
    tags: { type: [String], default: [] },
    isFavorite: { type: Boolean, default: false },
    size: { type: Number },
    checksum: { type: String },
    status: {
      type: String,
      enum: ["pending", "ready", "error"],
      default: "ready",
    },
    uploadUri: { type: String },
    driveFileId: { type: String },
    lastOpenedAt: { type: Date },
    readingTime: { type: String },
    ownerId: { type: String, required: true, index: true },
    /**
     * @field ai
     * @description AI-generated metadata for semantic search, summarization, and smart organization.
     */
    ai: {
      summary: { type: String },
      shortSummary: { type: String },
      topics: { type: [String] },
      tags: { type: [String] },
      entities: [
        {
          name: { type: String, required: true },
          type: { type: String, required: true },
        },
      ],
      keyPoints: { type: [String] },
      keywords: { type: [String] },
      language: { type: String },
      sentiment: { type: String },
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      contentType: { type: String },
      processedAt: { type: Date },
      model: { type: String },
      version: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);
ResourceSchema.index({ ownerId: 1, projectId: 1, listId: 1 });
ResourceSchema.index({ ownerId: 1, checksum: 1 });
ResourceSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
    "ai.shortSummary": "text",
    "ai.topics": "text",
    "ai.keywords": "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      description: 2,
      "ai.shortSummary": 1,
      "ai.topics": 1,
      "ai.keywords": 1,
    },
    name: "resource_text_index",
  },
);
ResourceSchema.plugin(tenantIsolationPlugin);
var ResourceModel =
  mongoose3.models.Resource || mongoose3.model("Resource", ResourceSchema);

// src/models/Project.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var ProjectSchema = new Schema3(
  {
    name: { type: String, required: true },
    /**
     * @field slug
     * @description URL-friendly identifier. Enforced unique per owner via compound index.
     */
    slug: { type: String, required: true },
    // We'll enforce unique per owner later if needed, but uniqueness across all requires careful tenant scoping or just compound index
    description: { type: String },
    icon: { type: String },
    status: { type: String, enum: ["active", "deleting"], default: "active" },
    ownerId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);
ProjectSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
ProjectSchema.plugin(tenantIsolationPlugin);
var ProjectModel =
  mongoose4.models.Project || mongoose4.model("Project", ProjectSchema);

// src/models/KnowledgeList.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var KnowledgeListSchema = new Schema4(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    position: { type: Number, required: true },
    status: { type: String, enum: ["active", "deleting"], default: "active" },
    ownerId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);
KnowledgeListSchema.index({ ownerId: 1, projectId: 1, position: 1 });
KnowledgeListSchema.index(
  { ownerId: 1, projectId: 1, slug: 1 },
  { unique: true },
);
KnowledgeListSchema.plugin(tenantIsolationPlugin);
var KnowledgeListModel =
  mongoose5.models.KnowledgeList ||
  mongoose5.model("KnowledgeList", KnowledgeListSchema);

// src/services/db-utils.ts
async function updateById(model, id, updates) {
  return model.findByIdAndUpdate(
    id,
    { $set: updates },
    {
      new: true,
      runValidators: true,
    },
  );
}

// src/services/resource.service.ts
function queryResources(filter, opts = {}) {
  let query = ResourceModel.find(filter).select(opts.select ?? "-content");
  if (opts.sort) query = query.sort(opts.sort);
  if (opts.limit !== void 0) query = query.limit(opts.limit);
  return query;
}
async function listResourcesByProject(projectId, listId) {
  const filter = { projectId };
  if (listId) {
    filter.listId = listId;
  }
  return queryResources(filter, { sort: { createdAt: -1 } });
}
async function findResourceById(id) {
  return ResourceModel.findById(id);
}
async function isDuplicateTitle(projectId, title, ownerId, excludeId) {
  const filter = {
    projectId,
    title,
    ownerId,
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const existing = await ResourceModel.findOne(filter);
  return !!existing;
}
async function validateListMembership(listId, projectId) {
  return KnowledgeListModel.findOne({ _id: listId, projectId });
}
async function findListById(listId) {
  return KnowledgeListModel.findById(listId);
}
async function createResource(data) {
  const resource = new ResourceModel({
    ...data,
    status: data.status ?? "ready",
  });
  await resource.save();
  return resource;
}
async function createResourceWithUpload(
  ownerId,
  body,
  storageAdapter,
  fileStream,
  mimeType,
  checksum,
) {
  const list = await validateListMembership(body.listId, body.projectId);
  if (!list) {
    throw new Error("Knowledge List not found in the specified project");
  }
  if (checksum) {
    const duplicate = await ResourceModel.findOne({ ownerId, checksum });
    if (duplicate) {
      const project = await ProjectModel.findById(duplicate.projectId);
      const duplicateList = await KnowledgeListModel.findById(duplicate.listId);
      const projectName = project?.name || "Unknown Project";
      const listName = duplicateList?.name || "Unknown Collection";
      throw new Error(
        `This resource has already been added to ${projectName} > ${listName}.`,
      );
    }
  }
  const exists = await isDuplicateTitle(body.projectId, body.title, ownerId);
  if (exists) {
    throw new Error("A resource with this name already exists in the project");
  }
  const isFileUpload = body.type !== "url";
  if (isFileUpload && !fileStream) {
    throw new Error("File stream required for this resource type");
  }
  const resource = await createResource({
    ...body,
    checksum,
    status: isFileUpload ? "pending" : "ready",
  });
  if (!isFileUpload) return resource;
  let uploadedDriveFileId;
  try {
    const mType =
      mimeType ||
      body.mimeType ||
      (body.type === "pdf"
        ? "application/pdf"
        : body.type === "image"
          ? "image/jpeg"
          : "text/plain");
    const uploadResult = await storageAdapter.uploadFile(
      ownerId,
      {
        title: body.title,
        mimeType: mType,
        projectId: body.projectId,
        listId: body.listId,
      },
      fileStream,
    );
    uploadedDriveFileId = uploadResult.driveFileId;
    const updatedResource = await updateResource(resource._id.toString(), {
      driveFileId: uploadResult.driveFileId,
      size: uploadResult.size,
      status: "ready",
    });
    return updatedResource || (await findResourceById(resource._id.toString()));
  } catch (error) {
    if (uploadedDriveFileId) {
      await storageAdapter
        .deleteFiles(ownerId, [uploadedDriveFileId])
        .catch((e) =>
          console.error("Failed to compensate orphan drive file", e),
        );
    }
    if (!isFileUpload) {
      await deleteResourceById(resource._id.toString());
    }
    throw error;
  }
}
async function updateResource(id, updates) {
  return updateById(ResourceModel, id, updates);
}
async function deleteResourceById(id) {
  return ResourceModel.findByIdAndDelete(id);
}

// src/services/user.service.ts
var STORAGE_BEARING_TYPES = ["markdown", "pdf", "image", "ebook", "text"];
async function findOrCreateUser(ownerId) {
  let user = await UserModel.findOne({ ownerId });
  if (!user) {
    try {
      user = await UserModel.create({ ownerId });
    } catch (err) {
      if (err.code === 11e3) {
        user = await UserModel.findOne({ ownerId });
      } else {
        throw err;
      }
    }
  }
  return user;
}
async function getSettings(ownerId) {
  const user = await findOrCreateUser(ownerId);
  return { driveRefreshToken: user.driveRefreshToken };
}
async function updateSettings(ownerId, input) {
  const user = await findOrCreateUser(ownerId);
  if (input.driveRefreshToken !== void 0) {
    user.driveRefreshToken = input.driveRefreshToken;
    await user.save();
  }
  return { driveRefreshToken: user.driveRefreshToken };
}
async function getFavorites() {
  return queryResources({ isFavorite: true }, { sort: { updatedAt: -1 } });
}
async function getRecent(limit = 10) {
  return queryResources(
    {},
    { sort: { lastOpenedAt: -1, updatedAt: -1 }, limit },
  );
}
async function getMetrics(ownerId, storage) {
  const agg = await ResourceModel.aggregate([
    {
      $group: {
        _id: "$type",
        totalSize: { $sum: { $ifNull: ["$size", 0] } },
        count: { $sum: 1 },
      },
    },
  ]);
  let usedByNexus = 0;
  let resourceCount = 0;
  const byType = {};
  for (const type of STORAGE_BEARING_TYPES) {
    byType[type] = 0;
  }
  for (const row of agg) {
    resourceCount += row.count;
    if (STORAGE_BEARING_TYPES.includes(row._id)) {
      byType[row._id] = row.totalSize;
      usedByNexus += row.totalSize;
    }
  }
  const [projectCount, listCount] = await Promise.all([
    ProjectModel.countDocuments(),
    KnowledgeListModel.countDocuments(),
  ]);
  const drive = {
    connected: false,
    usedInDrive: null,
    limit: null,
    remaining: null,
  };
  try {
    const user = await UserModel.findOne({ ownerId });
    const isConnected = !!user?.driveRefreshToken;
    if (isConnected) {
      drive.connected = true;
      const quota = await storage.getQuota(ownerId);
      if (quota) {
        drive.usedInDrive = quota.usedInDrive;
        drive.limit = quota.limit;
        drive.remaining =
          quota.limit === null ? null : quota.limit - quota.usedInDrive;
      }
    }
  } catch (err) {
    console.error(`Failed to fetch drive metrics for ${ownerId}:`, err.message);
  }
  return {
    usedByNexus,
    resourceCount,
    projectCount,
    listCount,
    byType,
    drive,
  };
}

// src/utils/oauth/types.ts
var OAuthExchangeError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "OAuthExchangeError";
  }
  status;
};
var OAuthProfileError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "OAuthProfileError";
  }
  status;
};

// src/utils/oauth/google.ts
import { google } from "googleapis";
function buildGoogleAuthClient(refreshToken, { clientId, clientSecret }) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}
async function authorizeWithGoogle(
  provider,
  code,
  redirectUri,
  persistRefreshToken,
) {
  const tokens = await provider.exchangeCode(code, redirectUri);
  const identity = await provider.getIdentity(tokens.accessToken);
  if (tokens.refreshToken) {
    await persistRefreshToken(tokens.refreshToken, identity);
  }
  return { tokens, identity };
}
var GoogleOAuthProvider = class {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }
  clientId;
  clientSecret;
  getAuthorizationUrl(state, redirectUri, scopes = []) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      prompt: "consent",
      access_type: "offline",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new OAuthExchangeError(
        `Google token exchange failed: ${errBody}`,
        res.status,
      );
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
  async getIdentity(accessToken) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new OAuthProfileError(`Google userinfo fetch failed`, res.status);
    }
    const data = await res.json();
    return {
      id: `google_${data.sub}`,
      email: data.email ?? null,
      name: data.name ?? null,
      image: data.picture ?? null,
    };
  }
  buildAuthedClient(refreshToken) {
    return buildGoogleAuthClient(refreshToken, {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }
  async revokeConnection(refreshToken) {
    const oauth2Client = this.buildAuthedClient(refreshToken);
    await oauth2Client.revokeToken(refreshToken);
  }
};

// src/utils/oauth.ts
import crypto2 from "node:crypto";
var frontendUrl = () =>
  (
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  ).replace(/\/+$/, "");
var apiUrl = () =>
  (
    process.env.API_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:8080")
  ).replace(/\/+$/, "");
function generateState() {
  return crypto2.randomBytes(16).toString("hex");
}

// src/routes/auth.ts
function getSigningKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}
async function signSessionJwt(payload) {
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    image: payload.image,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSigningKey());
}
var authRoutes = fp2(async (fastify2) => {
  fastify2.get(
    "/api/auth/google",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (_request, reply) => {
      const redirectUri = `${apiUrl()}/api/auth/callback/google`;
      const state = generateState();
      SessionManager.setOAuthState(reply, state);
      try {
        const provider = fastify2.oauth.getProvider("google");
        const url = provider.getAuthorizationUrl(state, redirectUri, [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/drive.file",
        ]);
        return reply.redirect(url);
      } catch (err) {
        return reply.status(500).send({ error: "Google OAuth not configured" });
      }
    },
  );
  fastify2.get(
    "/api/auth/callback/google",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { code, state, error } = request.query;
      if (error || !code || !state) {
        fastify2.log.warn(
          { error },
          "Google OAuth error or missing code/state",
        );
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_missing_params`,
        );
      }
      const stateCookie = SessionManager.getOAuthState(request);
      if (!stateCookie || stateCookie !== state) {
        fastify2.log.warn("Google OAuth state mismatch");
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_state`,
        );
      }
      SessionManager.clearOAuthState(reply);
      try {
        const redirectUri = `${apiUrl()}/api/auth/callback/google`;
        const provider = fastify2.oauth.getProvider("google");
        const { tokens, identity } = await authorizeWithGoogle(
          provider,
          code,
          redirectUri,
          (refreshToken, identity2) =>
            updateSettings(identity2.id, {
              driveRefreshToken: refreshToken,
            }),
        );
        const ownerId = identity.id;
        if (!tokens.refreshToken) {
          await findOrCreateUser(ownerId);
        }
        const jwt = await signSessionJwt({
          sub: ownerId,
          email: identity.email,
          name: identity.name,
          image: identity.image,
        });
        return reply.redirect(`${frontendUrl()}/api/auth/sync?token=${jwt}`);
      } catch (err) {
        fastify2.log.error(err, "Google OAuth callback error");
        if (err.name === "OAuthExchangeError") {
          return reply.redirect(
            `${frontendUrl()}/signin?error=auth_failed_token`,
          );
        }
        if (err.name === "OAuthProfileError") {
          return reply.redirect(
            `${frontendUrl()}/signin?error=auth_failed_userinfo`,
          );
        }
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_catch`,
        );
      }
    },
  );
});

// src/routes/projects.ts
var import_shared = __toESM(require_dist(), 1);
import { z } from "zod";

// src/services/slugify.ts
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// src/services/project.service.ts
async function listProjectsWithCounts() {
  return ProjectModel.aggregate([
    {
      $lookup: {
        from: "knowledgelists",
        let: { projectId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$projectId", "$$projectId"] },
            },
          },
          { $count: "count" },
        ],
        as: "listData",
      },
    },
    {
      $addFields: {
        id: { $toString: "$_id" },
        listCount: {
          $ifNull: [{ $arrayElemAt: ["$listData.count", 0] }, 0],
        },
      },
    },
    { $project: { listData: 0, __v: 0 } },
    { $sort: { createdAt: -1 } },
  ]);
}
async function createProject(input) {
  const slug = slugify(input.name);
  const project = new ProjectModel({ ...input, slug });
  await project.save();
  return project;
}
async function updateProject(id, input) {
  const updates = { ...input };
  if (input.name) {
    updates.slug = slugify(input.name);
  }
  return updateById(ProjectModel, id, updates);
}
async function findProjectById(id) {
  return ProjectModel.findById(id);
}

// src/routes/projects.ts
var projectRoutes = async (server) => {
  server.get(
    "/api/projects",
    {
      schema: {
        response: {
          200: z.array(import_shared.ProjectSchema),
        },
      },
    },
    async (_request, _reply) => {
      const projects = await listProjectsWithCounts();
      return (0, import_shared.safeArrayResponse)(
        import_shared.ProjectSchema,
      ).parse(projects);
    },
  );
  server.post(
    "/api/projects",
    {
      schema: {
        body: import_shared.CreateProjectSchema,
        response: {
          201: import_shared.ProjectSchema,
          409: import_shared.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await createProject(request.body);
      return reply.status(201).send(project);
    },
  );
  server.get(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: import_shared.ProjectSchema,
          404: import_shared.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await findProjectById(request.params.id);
      if (!project) {
        return reply.status(404).send({
          ok: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }
      return project;
    },
  );
  server.patch(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: import_shared.UpdateProjectSchema,
        response: {
          200: import_shared.ProjectSchema,
          404: import_shared.ErrorResponseSchema,
          409: import_shared.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await updateProject(request.params.id, request.body);
      if (!project) {
        return reply.status(404).send({
          ok: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }
      return project;
    },
  );
  server.delete(
    "/api/projects/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          204: z.null(),
          404: import_shared.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ownerId = request.ownerId;
      const projectId = request.params.id;
      const project = await findProjectById(projectId);
      if (!project) {
        return reply.status(404).send({
          ok: false,
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }
      await server.deleter.deleteProject(projectId, ownerId);
      return reply.status(204).send(null);
    },
  );
};

// src/routes/lists.ts
var import_shared2 = __toESM(require_dist(), 1);
import { z as z2 } from "zod";

// src/utils/errors.ts
var ApplicationError = class extends Error {
  constructor(message, code, statusCode = 500, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  code;
  statusCode;
  details;
};
var NotFoundError = class extends ApplicationError {
  constructor(resource, id) {
    super(`${resource} not found`, "NOT_FOUND", 404, id ? { id } : void 0);
  }
};

// src/services/list.service.ts
async function listByProject(projectId) {
  return KnowledgeListModel.find({ projectId }).sort({ position: 1 });
}
async function findListById2(id) {
  return KnowledgeListModel.findById(id);
}
async function createList(projectId, input) {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  const slug = slugify(input.name);
  const lastList = await KnowledgeListModel.findOne({ projectId }).sort({
    position: -1,
  });
  const position = lastList ? lastList.position + 1 : 0;
  const list = new KnowledgeListModel({
    ...input,
    projectId,
    slug,
    position,
  });
  await list.save();
  return list;
}
async function updateList(id, input) {
  const updates = { ...input };
  if (input.name) {
    updates.slug = slugify(input.name);
  }
  return updateById(KnowledgeListModel, id, updates);
}
async function reorderLists(projectId, ownerId, items) {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, projectId, ownerId },
      update: { $set: { position: item.position } },
    },
  }));
  if (bulkOps.length > 0) {
    await KnowledgeListModel.bulkWrite(bulkOps);
  }
}

// src/routes/lists.ts
var listRoutes = async (server) => {
  server.get(
    "/api/projects/:projectId/lists",
    {
      schema: {
        params: z2.object({ projectId: z2.string() }),
        response: {
          200: z2.array(import_shared2.KnowledgeListSchema),
        },
      },
    },
    async (request, _reply) => {
      const lists = await listByProject(request.params.projectId);
      return (0, import_shared2.safeArrayResponse)(
        import_shared2.KnowledgeListSchema,
      ).parse(lists);
    },
  );
  server.get(
    "/api/lists/:id",
    {
      schema: {
        params: z2.object({ id: z2.string() }),
        response: {
          200: import_shared2.KnowledgeListSchema,
          404: import_shared2.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const list = await findListById2(request.params.id);
      if (!list) {
        throw new NotFoundError("List", request.params.id);
      }
      return list;
    },
  );
  server.post(
    "/api/projects/:projectId/lists",
    {
      schema: {
        params: z2.object({ projectId: z2.string() }),
        body: import_shared2.CreateKnowledgeListSchema.omit({
          projectId: true,
        }),
        response: {
          201: import_shared2.KnowledgeListSchema,
          404: import_shared2.ErrorResponseSchema,
          409: import_shared2.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const list = await createList(request.params.projectId, request.body);
        return reply.status(201).send(list);
      } catch (error) {
        if (error.message === "Project not found") {
          throw new NotFoundError("Project", request.params.projectId);
        }
        throw error;
      }
    },
  );
  server.patch(
    "/api/lists/:id",
    {
      schema: {
        params: z2.object({ id: z2.string() }),
        body: import_shared2.UpdateKnowledgeListSchema,
        response: {
          200: import_shared2.KnowledgeListSchema,
          404: import_shared2.ErrorResponseSchema,
          409: import_shared2.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const list = await updateList(request.params.id, request.body);
      if (!list) {
        throw new NotFoundError("List", request.params.id);
      }
      return list;
    },
  );
  server.delete(
    "/api/lists/:id",
    {
      schema: {
        params: z2.object({ id: z2.string() }),
        response: {
          204: z2.null(),
          404: import_shared2.ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const listId = request.params.id;
      const ownerId = request.ownerId;
      const list = await findListById2(listId);
      if (!list) {
        throw new NotFoundError("List", listId);
      }
      await server.deleter.deleteList(listId, ownerId);
      return reply.status(204).send(null);
    },
  );
  server.put(
    "/api/projects/:projectId/lists/reorder",
    {
      schema: {
        params: z2.object({ projectId: z2.string() }),
        body: import_shared2.ReorderKnowledgeListSchema,
        response: {
          200: z2.object({ success: z2.boolean() }),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { items } = request.body;
      const ownerId = request.ownerId;
      await reorderLists(projectId, ownerId, items);
      return reply.send({ success: true });
    },
  );
};

// src/routes/resources.ts
var import_shared3 = __toESM(require_dist(), 1);
import { z as z3 } from "zod";

// src/utils/multipart.ts
import { Readable } from "stream";
import crypto3 from "crypto";
async function parseMultipartResourceRequest(request) {
  const body = {};
  let fileStream;
  let mimeType = "";
  let checksum;
  let fileBuffer = null;
  for await (const part of request.parts()) {
    if (part.type === "file") {
      mimeType = part.mimetype;
      const chunks = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      fileBuffer = Buffer.concat(chunks);
    } else {
      if (body[part.fieldname] !== void 0) {
        if (Array.isArray(body[part.fieldname])) {
          body[part.fieldname].push(part.value);
        } else {
          body[part.fieldname] = [body[part.fieldname], part.value];
        }
      } else {
        let value = part.value;
        if (
          typeof value === "string" &&
          value.startsWith("[") &&
          value.endsWith("]")
        ) {
          try {
            value = JSON.parse(value);
          } catch (e) {}
        }
        body[part.fieldname] = value;
      }
    }
  }
  if (body.isFavorite !== void 0) {
    body.isFavorite = body.isFavorite === "true";
  }
  if (fileBuffer) {
    fileStream = Readable.from(fileBuffer);
    checksum = crypto3.createHash("sha256").update(fileBuffer).digest("hex");
  }
  return { body, fileStream, mimeType, checksum };
}

// src/routes/resources.ts
function notFoundReply(reply, message = "Resource not found") {
  return reply.status(404).send({ error: message });
}
var resourceRoutes = async (server) => {
  server.get(
    "/api/projects/:projectId/resources",
    {
      schema: {
        params: z3.object({ projectId: z3.string() }),
        querystring: z3.object({ listId: z3.string().optional() }),
        response: {
          200: z3.array(import_shared3.ResourceSchema),
        },
      },
    },
    async (request, _reply) => {
      const { projectId } = request.params;
      const { listId } = request.query;
      const resources = await listResourcesByProject(projectId, listId);
      return (0, import_shared3.safeArrayResponse)(
        import_shared3.ResourceSchema,
      ).parse(resources);
    },
  );
  server.post(
    "/api/resources",
    {
      bodyLimit: 14 * 1024 * 1024,
      // 14MB limit
      schema: {
        response: {
          201: import_shared3.ResourceSchema,
          400: z3.object({ error: z3.string() }),
          404: z3.object({ error: z3.string() }),
          413: z3.object({ error: z3.string() }),
          500: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      let body;
      let fileStream;
      let mimeType = "";
      let checksum;
      try {
        if (request.isMultipart()) {
          const parsed = await parseMultipartResourceRequest(request);
          body = parsed.body;
          fileStream = parsed.fileStream;
          mimeType = parsed.mimeType;
          checksum = parsed.checksum;
        } else {
          body = request.body;
        }
        const parsedBody = import_shared3.CreateResourceSchema.safeParse(body);
        if (!parsedBody.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsedBody.error.issues,
          });
        }
        const resource = await createResourceWithUpload(
          request.ownerId,
          parsedBody.data,
          server.storage,
          fileStream,
          mimeType,
          checksum,
        );
        return reply.status(201).send(resource);
      } catch (err) {
        const msg = err?.message || "";
        if (msg.includes("Knowledge List not found")) {
          return reply.status(404).send({ error: err.message });
        }
        if (err.code === "FST_REQ_FILE_TOO_LARGE") {
          return reply.status(413).send({ error: "File too large (max 14MB)" });
        }
        if (
          msg.includes("already exists") ||
          msg.includes("has already been added to") ||
          err.name === "StorageError" ||
          err.name === "TokenRevokedError" ||
          msg.includes("stream required")
        ) {
          return reply.status(400).send({ error: err.message });
        }
        request.log.error(err, "Resource creation failed");
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
  server.get(
    "/api/resources/:id",
    {
      schema: {
        params: z3.object({ id: z3.string() }),
        response: {
          200: import_shared3.ResourceSchema,
          404: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      const resource = await findResourceById(request.params.id);
      if (!resource) return notFoundReply(reply);
      return resource;
    },
  );
  server.get(
    "/api/resources/:id/file",
    {
      schema: {
        params: z3.object({ id: z3.string() }),
        response: {
          400: z3.object({ error: z3.string() }),
          404: z3.object({ error: z3.string() }),
          500: z3.object({ error: z3.string() }),
          // 200 is omitted because it streams binary data
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const ownerId = request.ownerId;
      const resource = await findResourceById(id);
      if (!resource || !resource.driveFileId) {
        return notFoundReply(reply, "Resource or file not found");
      }
      try {
        const { stream, headers, status } = await server.storage.getFileStream(
          ownerId,
          resource.driveFileId,
          request.headers.range,
        );
        reply.header(
          "Content-Type",
          resource.mimeType || "application/octet-stream",
        );
        if (resource.size) {
          reply.header("Content-Length", resource.size.toString());
        }
        for (const [key, value] of Object.entries(headers)) {
          reply.header(key, value);
        }
        reply.status(status);
        return reply.send(stream);
      } catch (err) {
        request.log.error(err, "Failed to stream file");
        if (err.name === "StorageError") {
          return reply.status(400).send({ error: err.message });
        }
        return reply.status(500).send({ error: "Failed to fetch file" });
      }
    },
  );
  server.put(
    "/api/resources/:id/favorite",
    {
      schema: {
        params: z3.object({ id: z3.string() }),
        body: z3.object({ isFavorite: z3.boolean() }),
        response: {
          200: import_shared3.ResourceSchema,
          400: z3.object({ error: z3.string() }),
          404: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      const { isFavorite } = request.body;
      const updated = await updateResource(request.params.id, { isFavorite });
      if (!updated) return notFoundReply(reply);
      return updated;
    },
  );
  server.post(
    "/api/resources/:id/open",
    {
      schema: {
        params: z3.object({ id: z3.string() }),
        response: {
          200: import_shared3.ResourceSchema,
          404: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      const resource = await updateResource(request.params.id, {
        lastOpenedAt: /* @__PURE__ */ new Date(),
      });
      if (!resource) return notFoundReply(reply);
      return resource;
    },
  );
  server.patch(
    "/api/resources/:id",
    {
      bodyLimit: 14 * 1024 * 1024,
      // 14MB limit
      schema: {
        params: z3.object({ id: z3.string() }),
        body: import_shared3.UpdateResourceSchema,
        response: {
          200: import_shared3.ResourceSchema,
          400: z3.object({ error: z3.string() }),
          404: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const resource = await findResourceById(request.params.id);
      if (!resource) return notFoundReply(reply);
      if (body.listId) {
        const list = await findListById(body.listId);
        if (!list) {
          return reply.status(404).send({ error: "Knowledge List not found" });
        }
        body.projectId = list.projectId;
      } else {
        delete body.projectId;
      }
      const targetProjectId = body.projectId || resource.projectId;
      const titleToCheck = body.title ?? resource.title;
      const projectChanged =
        body.projectId && body.projectId !== resource.projectId;
      const titleChanged = body.title && body.title !== resource.title;
      if (projectChanged || titleChanged) {
        const ownerId = request.ownerId;
        const exists = await isDuplicateTitle(
          targetProjectId,
          titleToCheck,
          ownerId,
          request.params.id,
        );
        if (exists) {
          return reply.status(400).send({
            error: "A resource with this name already exists in the project",
          });
        }
      }
      const updatedResource = await updateResource(request.params.id, body);
      return updatedResource;
    },
  );
  server.delete(
    "/api/resources/:id",
    {
      schema: {
        params: z3.object({ id: z3.string() }),
        response: {
          204: z3.null(),
          404: z3.object({ error: z3.string() }),
        },
      },
    },
    async (request, reply) => {
      const ownerId = request.ownerId;
      const resource = await findResourceById(request.params.id);
      if (!resource) return notFoundReply(reply);
      await server.deleter.deleteResource(request.params.id, ownerId);
      return reply.status(204).send(null);
    },
  );
};

// src/routes/progress.ts
var import_shared4 = __toESM(require_dist(), 1);
import { z as z4 } from "zod";

// src/models/PdfProgress.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var pdfProgressSchema = new Schema5(
  {
    userId: { type: String, required: true, index: true },
    documentUrl: { type: String, required: true },
    currentPage: { type: Number, required: true },
    maxPageReached: { type: Number, required: true },
    lastReadAt: { type: String, required: true },
  },
  { timestamps: true },
);
pdfProgressSchema.index({ userId: 1, documentUrl: 1 }, { unique: true });
pdfProgressSchema.plugin(tenantIsolationPlugin);
var PdfProgressModel = mongoose6.model("PdfProgress", pdfProgressSchema);

// src/routes/progress.ts
var progressRoutes = async (app) => {
  app.post(
    "/api/progress",
    { schema: { body: import_shared4.UpsertPdfProgressRequestSchema } },
    async (request, reply) => {
      const userId = request.ownerId;
      const { documentUrl, currentPage, maxPageReached } = request.body;
      const lastReadAt = /* @__PURE__ */ new Date().toISOString();
      const progress = await PdfProgressModel.findOneAndUpdate(
        { userId, documentUrl },
        {
          $set: { currentPage, lastReadAt },
          $max: { maxPageReached },
        },
        { upsert: true, returnDocument: "after" },
      );
      return reply.send(progress);
    },
  );
  app.get(
    "/api/progress",
    { schema: { querystring: z4.object({ documentUrl: z4.string() }) } },
    async (request, reply) => {
      const userId = request.ownerId;
      const { documentUrl } = request.query;
      const progress = await PdfProgressModel.findOne({ userId, documentUrl });
      return reply.send(progress || null);
    },
  );
};

// src/routes/user.ts
var import_shared5 = __toESM(require_dist(), 1);
import { z as z5 } from "zod";
var userRoutes = async (server) => {
  server.get(
    "/api/user/settings",
    {
      schema: {
        response: {
          200: import_shared5.UserSettingsSchema,
        },
      },
    },
    async (request, _reply) => {
      return getSettings(request.ownerId);
    },
  );
  server.patch(
    "/api/user/settings",
    {
      schema: {
        body: import_shared5.UpdateUserSettingsSchema,
        response: {
          200: import_shared5.UserSettingsSchema,
        },
      },
    },
    async (request, _reply) => {
      return updateSettings(request.ownerId, request.body);
    },
  );
  server.get(
    "/api/user/favorites",
    {
      schema: {
        response: {
          200: z5.array(import_shared5.ResourceSchema),
        },
      },
    },
    async (_request, _reply) => {
      const favorites = await getFavorites();
      return (0, import_shared5.safeArrayResponse)(
        import_shared5.ResourceSchema,
      ).parse(favorites);
    },
  );
  server.get(
    "/api/user/recent",
    {
      schema: {
        response: {
          200: z5.array(import_shared5.ResourceSchema),
        },
      },
    },
    async (_request, _reply) => {
      const recent = await getRecent();
      return (0, import_shared5.safeArrayResponse)(
        import_shared5.ResourceSchema,
      ).parse(recent);
    },
  );
  server.get(
    "/api/user/metrics",
    {
      schema: {
        response: {
          200: import_shared5.UserMetricsSchema,
        },
      },
    },
    async (request, _reply) => {
      return getMetrics(request.ownerId, server.storage);
    },
  );
};

// src/routes/search.ts
import { z as z6 } from "zod";
var import_shared6 = __toESM(require_dist(), 1);
var scopeFilter = (ownerId, projectId) => {
  const filter = { ownerId };
  if (projectId) filter.projectId = projectId;
  return filter;
};
var searchRoutes = async (server) => {
  server.get(
    "/api/search",
    {
      schema: {
        querystring: z6.object({
          q: z6.string().min(1),
          projectId: z6.string().optional(),
        }),
        response: {
          200: z6.array(import_shared6.ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { q, projectId } = request.query;
      const ownerId = request.ownerId;
      const filter = {
        ...scopeFilter(ownerId, projectId),
        $text: { $search: q },
      };
      const resources = await ResourceModel.find(filter, {
        score: { $meta: "textScore" },
      })
        .select("-content")
        .sort({ score: { $meta: "textScore" } })
        .limit(50);
      return (0, import_shared6.safeArrayResponse)(
        import_shared6.ResourceSchema,
      ).parse(resources);
    },
  );
  server.get(
    "/api/search/suggestions",
    {
      schema: {
        querystring: z6.object({
          q: z6.string().min(1),
          projectId: z6.string().optional(),
        }),
        response: {
          200: z6.array(
            z6.object({
              id: z6.string(),
              title: z6.string(),
              type: z6.string(),
            }),
          ),
        },
      },
    },
    async (request, reply) => {
      const { q, projectId } = request.query;
      const ownerId = request.ownerId;
      const filter = {
        ...scopeFilter(ownerId, projectId),
        title: { $regex: q, $options: "i" },
      };
      return queryResources(filter, { select: "title type", limit: 10 });
    },
  );
  server.get(
    "/api/favorites",
    {
      schema: {
        querystring: z6.object({
          projectId: z6.string().optional(),
        }),
        response: {
          200: z6.array(import_shared6.ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.query;
      const ownerId = request.ownerId;
      const filter = {
        ...scopeFilter(ownerId, projectId),
        isFavorite: true,
      };
      const resources = await queryResources(filter, {
        sort: { updatedAt: -1 },
      });
      return (0, import_shared6.safeArrayResponse)(
        import_shared6.ResourceSchema,
      ).parse(resources);
    },
  );
  server.get(
    "/api/recent",
    {
      schema: {
        querystring: z6.object({
          projectId: z6.string().optional(),
        }),
        response: {
          200: z6.array(import_shared6.ResourceSchema),
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.query;
      const ownerId = request.ownerId;
      const filter = {
        ...scopeFilter(ownerId, projectId),
        lastOpenedAt: { $exists: true },
      };
      const resources = await queryResources(filter, {
        sort: { lastOpenedAt: -1 },
        limit: 20,
      });
      return (0, import_shared6.safeArrayResponse)(
        import_shared6.ResourceSchema,
      ).parse(resources);
    },
  );
};

// src/routes/integrations.ts
import fp3 from "fastify-plugin";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
function getSigningKey2() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}
var integrationRoutes = fp3(async (fastify2) => {
  fastify2.get("/api/integrations/google-drive", async (request, reply) => {
    const redirectUri = `${apiUrl()}/api/integrations/google-drive/callback`;
    const nonce = generateState();
    const ownerId = request.ownerId;
    const stateJwt = await new SignJWT2({ nonce, ownerId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(getSigningKey2());
    SessionManager.setIntegrationState(reply, stateJwt);
    try {
      const provider = fastify2.oauth.getProvider("google");
      const url = provider.getAuthorizationUrl(nonce, redirectUri, [
        "https://www.googleapis.com/auth/drive.file",
      ]);
      return reply.redirect(url);
    } catch (err) {
      return reply.status(500).send({ error: "Google Auth not configured" });
    }
  });
  fastify2.get(
    "/api/integrations/google-drive/callback",
    async (request, reply) => {
      const { code, state, error } = request.query;
      if (error || !code || !state) {
        return reply.redirect(`${frontendUrl()}/?error=drive_auth_failed`);
      }
      const stateJwt = SessionManager.getIntegrationState(request);
      if (!stateJwt) {
        return reply.redirect(`${frontendUrl()}/?error=state_missing`);
      }
      SessionManager.clearIntegrationState(reply);
      let ownerId = "";
      try {
        const { payload } = await jwtVerify2(stateJwt, getSigningKey2());
        if (payload.nonce !== state) {
          return reply.redirect(`${frontendUrl()}/?error=state_mismatch`);
        }
        ownerId = payload.ownerId;
      } catch (e) {
        return reply.redirect(`${frontendUrl()}/?error=state_invalid`);
      }
      if (!ownerId) {
        return reply.redirect(`${frontendUrl()}/?error=state_invalid`);
      }
      try {
        const redirectUri = `${apiUrl()}/api/integrations/google-drive/callback`;
        const provider = fastify2.oauth.getProvider("google");
        const tokens = await provider.exchangeCode(code, redirectUri);
        if (tokens.refreshToken) {
          await updateSettings(ownerId, {
            driveRefreshToken: tokens.refreshToken,
          });
          return reply.redirect(frontendUrl());
        } else {
          return reply.redirect(`${frontendUrl()}/?error=drive_token_missing`);
        }
      } catch (err) {
        if (err.name === "OAuthExchangeError") {
          return reply.redirect(`${frontendUrl()}/?error=drive_token_failed`);
        }
        return reply.redirect(
          `${frontendUrl()}/?error=drive_auth_failed_catch`,
        );
      }
    },
  );
  fastify2.post(
    "/api/integrations/google-drive/disconnect",
    async (request, reply) => {
      const { UserModel: UserModel2 } = await Promise.resolve().then(
        () => (init_User(), User_exports),
      );
      const user = await UserModel2.findOne({ ownerId: request.ownerId });
      if (user?.driveRefreshToken) {
        try {
          const provider = fastify2.oauth.getProvider("google");
          await provider.revokeConnection(user.driveRefreshToken);
        } catch (err) {
          request.log.warn(
            err,
            "Failed to revoke token on Google side; proceeding to clear local token.",
          );
        }
        user.driveRefreshToken = void 0;
        await user.save();
      }
      return reply.send({ success: true });
    },
  );
});

// src/index.ts
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

// src/utils/storage/plugin.ts
import fp4 from "fastify-plugin";

// src/utils/storage/types.ts
var StorageError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "StorageError";
  }
  cause;
};
var TokenRevokedError = class extends StorageError {
  constructor(message, ownerId, cause) {
    super(message, cause);
    this.ownerId = ownerId;
    this.name = "TokenRevokedError";
  }
  ownerId;
};

// src/utils/storage/drive.ts
import { google as google2 } from "googleapis";
var DriveStorageAdapter = class {
  /**
   * @desc    Construct the adapter with the OAuth client credentials
   * @param   {string} clientId - Google OAuth client ID
   * @param   {string} clientSecret - Google OAuth client secret
   * @param   {IDriveCredentialProvider} credentialProvider - Handles fetching and saving Drive credentials
   */
  constructor(
    clientId,
    clientSecret,
    credentialProvider,
    clientBuilder = (rt) => {
      throw new Error("Storage client builder not configured");
    },
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.credentialProvider = credentialProvider;
    this.clientBuilder = clientBuilder;
  }
  clientId;
  clientSecret;
  credentialProvider;
  clientBuilder;
  /**
   * @desc    Build an authenticated Drive client for a user, or fail if Drive is not connected
   * @param   {string} ownerId - The user whose refresh token is used
   * @returns {Promise<object>} Resolved Drive client, user document, and OAuth client
   */
  async getDrive(ownerId) {
    const creds = await this.credentialProvider.getCredentials(ownerId);
    if (!creds || !creds.refreshToken) {
      throw new StorageError("Google Drive integration not configured");
    }
    const oauth2Client = this.clientBuilder(creds.refreshToken);
    return {
      drive: google2.drive({ version: "v3", auth: oauth2Client }),
      folderId: creds.folderId,
      oauth2Client,
    };
  }
  folderLocks = /* @__PURE__ */ new Map();
  /**
   * @desc    Resolve or create the user's shared "Nexus" Drive folder
   * @param   {object} drive - An authenticated Drive v3 client
   * @param   {string} ownerId - The owner's ID
   * @param   {string} cachedFolderId - The previously saved folder ID, if any
   * @returns {Promise<string|null>} The Drive folder ID, or null if unavailable
   */
  async ensureDriveFolderInternal(drive, ownerId, cachedFolderId) {
    if (cachedFolderId) {
      try {
        const folderRes = await drive.files.get({
          fileId: cachedFolderId,
          fields: "id,trashed",
        });
        if (folderRes.data && !folderRes.data.trashed) {
          return cachedFolderId;
        }
      } catch (err) {}
    }
    const query =
      "name = 'Nexus' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const searchRes = await drive.files.list({
      q: query,
      spaces: "drive",
      fields: "files(id)",
    });
    let folderId = searchRes.data.files?.[0]?.id;
    if (!folderId) {
      const createRes = await drive.files.create({
        requestBody: {
          name: "Nexus",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = createRes.data.id;
    }
    await this.credentialProvider.saveFolderId(ownerId, folderId);
    return folderId;
  }
  async ensureDriveFolder(drive, ownerId, cachedFolderId) {
    if (this.folderLocks.has(ownerId)) {
      return this.folderLocks.get(ownerId);
    }
    const promise = this.ensureDriveFolderInternal(
      drive,
      ownerId,
      cachedFolderId,
    ).finally(() => {
      this.folderLocks.delete(ownerId);
    });
    this.folderLocks.set(ownerId, promise);
    return promise;
  }
  async getOrCreateSubfolder(drive, name, parentId) {
    const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await drive.files.list({
      q: query,
      spaces: "drive",
      fields: "files(id)",
    });
    if (searchRes.data.files && searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id;
    }
    const createRes = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });
    return createRes.data.id;
  }
  /**
   * @desc    Map a Drive API error to a standardized StorageError/TokenRevokedError
   * @param   {any} err - The error returned from Google API
   * @param   {string} ownerId - The owning user ID to associate with auth errors
   * @throws  {TokenRevokedError} If the user's Google tokens are invalid/revoked
   */
  handleDriveError(err, ownerId) {
    const message = err?.message?.toLowerCase() || "";
    const status = err?.response?.status || err?.status;
    if (status === 401 || message.includes("invalid_grant")) {
      throw new TokenRevokedError("Google Drive token revoked", ownerId, err);
    }
  }
  async uploadFile(ownerId, metadata, fileStream) {
    try {
      const { drive, folderId: cachedFolderId } = await this.getDrive(ownerId);
      let folderId = await this.ensureDriveFolder(
        drive,
        ownerId,
        cachedFolderId,
      );
      if (folderId && metadata.projectId) {
        folderId = await this.getOrCreateSubfolder(
          drive,
          metadata.projectId,
          folderId,
        );
        if (metadata.listId) {
          folderId = await this.getOrCreateSubfolder(
            drive,
            metadata.listId,
            folderId,
          );
        }
      }
      const parents = folderId ? [folderId] : void 0;
      const res = await drive.files.create({
        requestBody: {
          name: metadata.title,
          mimeType: metadata.mimeType,
          parents,
        },
        media: {
          mimeType: metadata.mimeType,
          body: fileStream,
        },
        fields: "id,size",
      });
      if (!res.data.id) {
        throw new Error("No file ID returned from Google Drive");
      }
      return {
        driveFileId: res.data.id,
        size: res.data.size ? parseInt(res.data.size, 10) : 0,
      };
    } catch (err) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(err.message || "Failed to upload file", err);
    }
  }
  /**
   * @desc    Begin a Drive resumable upload and return the upload URI for the client
   * @param   {string} ownerId - The owning user
   * @param   {object} metadata - Title and MIME type of the file to upload
   * @returns {Promise<string>} The resumable upload URI
   */
  async initializeUpload(ownerId, metadata) {
    try {
      const {
        drive,
        folderId: cachedFolderId,
        oauth2Client,
      } = await this.getDrive(ownerId);
      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;
      let folderId = await this.ensureDriveFolder(
        drive,
        ownerId,
        cachedFolderId,
      );
      if (folderId && metadata.projectId) {
        folderId = await this.getOrCreateSubfolder(
          drive,
          metadata.projectId,
          folderId,
        );
        if (metadata.listId) {
          folderId = await this.getOrCreateSubfolder(
            drive,
            metadata.listId,
            folderId,
          );
        }
      }
      const parents = folderId ? [folderId] : void 0;
      const driveRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": metadata.mimeType,
            // We omit Origin since this is server-to-server, or could pass a configured origin.
            // But since we are extracting this, we don't have access to request headers natively.
          },
          body: JSON.stringify({
            name: metadata.title,
            mimeType: metadata.mimeType,
            parents,
          }),
        },
      );
      if (!driveRes.ok) {
        throw new Error(`Failed to initialize upload: ${driveRes.statusText}`);
      }
      const uploadUri = driveRes.headers.get("location");
      if (!uploadUri) {
        throw new Error("Upload URI not returned by Google Drive");
      }
      return uploadUri;
    } catch (err) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        err.message || "Failed to initialize storage",
        err,
      );
    }
  }
  /**
   * @desc    Delete multiple Drive files for a user, skipping silently when Drive is not connected
   * @param   {string} ownerId - The owning user
   * @param   {string[]} fileIds - Drive file IDs to delete
   * @returns {Promise<void>} Resolves when deletion attempts complete
   */
  async deleteFiles(ownerId, fileIds) {
    if (!fileIds || fileIds.length === 0) return;
    let drive;
    try {
      const res = await this.getDrive(ownerId);
      drive = res.drive;
    } catch (err) {
      try {
        this.handleDriveError(err, ownerId);
      } catch (revokedErr) {
        throw revokedErr;
      }
      console.warn(
        `User ${ownerId} has no drive credentials, cannot delete files`,
      );
      return;
    }
    for (const fileId of fileIds) {
      if (!fileId) continue;
      try {
        await drive.files.delete({ fileId });
      } catch (err) {
        this.handleDriveError(err, ownerId);
        console.error(`Failed to delete drive file ${fileId}:`, err.message);
      }
    }
  }
  /**
   * @desc    Fetch the user's Drive storage quota
   * @param   {string} ownerId - The owning user
   * @returns {Promise<StorageQuota|null>} Quota snapshot, or null when unavailable
   */
  async getQuota(ownerId) {
    try {
      const { drive } = await this.getDrive(ownerId);
      const res = await drive.about.get({
        fields: "storageQuota(limit,usage,usageInDrive,usageInDriveTrash)",
      });
      const quota = res.data.storageQuota;
      if (!quota || quota.usageInDrive == null) {
        return null;
      }
      return {
        usedInDrive: Number(quota.usageInDrive),
        limit: quota.limit != null ? Number(quota.limit) : null,
      };
    } catch (err) {
      this.handleDriveError(err, ownerId);
      return null;
    }
  }
  /**
   * @desc    Retrieve a file stream from Drive to download to the client
   * @param   {string} ownerId - The owning user
   * @param   {string} fileId - The ID of the file in Google Drive
   * @param   {string} [rangeHeader] - Optional HTTP range header for partial downloads
   * @returns {Promise<{ stream: import("stream").Readable; headers: Record<string, string>; status: number }>}
   */
  async getFileStream(ownerId, fileId, rangeHeader) {
    try {
      const { oauth2Client } = await this.getDrive(ownerId);
      const accessTokenRes = await oauth2Client.getAccessToken();
      const accessToken = accessTokenRes.token;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };
      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers },
      );
      if (!driveRes.ok) {
        throw new Error(
          `Failed to fetch file from Drive: ${driveRes.statusText}`,
        );
      }
      const resultHeaders = {};
      const safeDriveHeaders = [
        "content-type",
        "content-disposition",
        "content-range",
        "accept-ranges",
      ];
      driveRes.headers.forEach((value, key) => {
        if (safeDriveHeaders.includes(key.toLowerCase())) {
          resultHeaders[key] = value;
        }
      });
      resultHeaders["accept-ranges"] = "bytes";
      const streamModule = await import("stream");
      return {
        stream: streamModule.Readable.fromWeb(driveRes.body),
        headers: resultHeaders,
        status: driveRes.status,
      };
    } catch (err) {
      this.handleDriveError(err, ownerId);
      if (err instanceof StorageError) throw err;
      throw new StorageError(
        err.message || "Failed to download file stream",
        err,
      );
    }
  }
};

// src/utils/storage/plugin.ts
init_User();
var storagePlugin = fp4(
  async (server, opts) => {
    let adapter = opts.adapter;
    if (!adapter) {
      if (!opts.clientId || !opts.clientSecret) {
        throw new Error(
          "StoragePlugin requires either an adapter or clientId and clientSecret",
        );
      }
      const credentialProvider = {
        async getCredentials(ownerId) {
          const user = await UserModel.findOne({ ownerId }).select(
            "driveRefreshToken driveFolderId",
          );
          if (!user || !user.driveRefreshToken) return null;
          return {
            refreshToken: user.driveRefreshToken,
            folderId: user.driveFolderId,
          };
        },
        async saveFolderId(ownerId, folderId) {
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
            clientId: opts.clientId,
            clientSecret: opts.clientSecret,
          }),
      );
    }
    server.decorate("storage", adapter);
  },
  { name: "storage-plugin" },
);

// src/plugins/deletion.ts
import fp5 from "fastify-plugin";

// src/utils/transactions.ts
import mongoose7 from "mongoose";
async function withTransaction(fn) {
  const session = await mongoose7.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// src/plugins/deletion.ts
var deletionPlugin = fp5(
  async (server) => {
    const deleter = {
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
          .filter(Boolean);
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
          .filter(Boolean);
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

// src/plugins/errorHandler.ts
import fp6 from "fastify-plugin";
init_User();
var errorHandlerPlugin = fp6(async (fastify2) => {
  fastify2.setErrorHandler(async function (error, request, reply) {
    let appError;
    if (error instanceof TokenRevokedError) {
      await UserModel.updateOne(
        { ownerId: error.ownerId },
        { $unset: { driveRefreshToken: 1 } },
      );
      appError = new ApplicationError(
        "Integration Revoked",
        "INTEGRATION_ERROR",
        401,
      );
    } else if ("validation" in error || error.code === "FST_ERR_VALIDATION") {
      appError = new ApplicationError(
        "Validation failed",
        "VALIDATION_ERROR",
        400,
        error.validation,
      );
    } else if (error.code === 11e3) {
      appError = new ApplicationError(
        "Resource already exists",
        "CONFLICT_ERROR",
        409,
        error.keyValue,
      );
    } else if (error.name === "CastError") {
      appError = new ApplicationError(
        "Invalid resource ID",
        "VALIDATION_ERROR",
        400,
      );
    } else if (error.name === "ValidationError") {
      appError = new ApplicationError(
        "Validation failed",
        "VALIDATION_ERROR",
        400,
        error.errors,
      );
    } else if (error.code === "FST_ERR_RESPONSE_SERIALIZATION") {
      appError = new ApplicationError(
        "Response doesn't match the schema",
        "INTERNAL_ERROR",
        500,
        error.cause || error,
      );
    } else if (error instanceof ApplicationError) {
      appError = error;
    } else {
      appError = new ApplicationError(
        error.message || "An unexpected error occurred",
        "INTERNAL_ERROR",
        500,
      );
    }
    if (appError.statusCode >= 500) {
      request.log.error({ err: error, req: request }, appError.message);
    } else {
      request.log.warn(
        { req: request, errCode: appError.code },
        appError.message,
      );
    }
    reply.status(appError.statusCode).send({
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    });
  });
});

// src/plugins/oauthProvider.ts
import fp7 from "fastify-plugin";
var oauthProviderPlugin = fp7(
  async (fastify2) => {
    const providers = /* @__PURE__ */ new Map();
    const googleId = process.env.AUTH_GOOGLE_ID;
    const googleSecret = process.env.AUTH_GOOGLE_SECRET;
    if (googleId && googleSecret) {
      providers.set("google", new GoogleOAuthProvider(googleId, googleSecret));
    }
    fastify2.decorate("oauth", {
      getProvider(name) {
        const provider = providers.get(name);
        if (!provider) {
          throw new Error(
            `OAuth provider '${name}' not found or not configured`,
          );
        }
        return provider;
      },
      registerProvider(name, provider) {
        providers.set(name, provider);
      },
    });
  },
  { name: "oauth-provider-plugin" },
);

// src/routes/info.ts
var import_shared7 = __toESM(require_dist(), 1);
import { z as z7 } from "zod";
var infoRoutes = async (server) => {
  server.get(
    "/api/info",
    {
      schema: {
        querystring: z7.object({
          type: z7.enum(["project", "list", "resource"]),
          id: z7.string(),
        }),
        response: {
          200: import_shared7.InfoSchema,
          404: z7.object({ error: z7.string() }),
        },
      },
    },
    async (request, reply) => {
      const { type, id } = request.query;
      if (type === "project") {
        const project = await ProjectModel.findById(id);
        if (!project)
          return reply.status(404).send({ error: "Project not found" });
        const listCount = await KnowledgeListModel.countDocuments({
          projectId: id,
        });
        const resourceCount = await ResourceModel.countDocuments({
          projectId: id,
        });
        return {
          id: project.id,
          type: "project",
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          listCount,
          resourceCount,
        };
      } else if (type === "list") {
        const list = await KnowledgeListModel.findById(id);
        if (!list) return reply.status(404).send({ error: "List not found" });
        const resourceCount = await ResourceModel.countDocuments({
          listId: id,
        });
        return {
          id: list.id,
          type: "list",
          name: list.name,
          description: list.description,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          resourceCount,
        };
      } else if (type === "resource") {
        const resource = await ResourceModel.findById(id);
        if (!resource)
          return reply.status(404).send({ error: "Resource not found" });
        return {
          id: resource.id,
          type: "resource",
          name: resource.title,
          description: resource.description,
          createdAt: resource.createdAt,
          updatedAt: resource.updatedAt,
          resourceType: resource.type,
          mimeType: resource.mimeType,
          size: resource.size,
          status: resource.status,
          readingTime: resource.readingTime,
        };
      }
    },
  );
};

// src/plugins/gc.ts
import fp8 from "fastify-plugin";

// src/gc.ts
init_User();
var isGCRunning = false;
async function runGarbageCollection(storageAdapter, deleter) {
  if (isGCRunning) return;
  isGCRunning = true;
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1e3);
    const staleResources = await ResourceModel.find(
      {
        status: "pending",
        updatedAt: { $lt: thirtyMinsAgo },
      },
      null,
      { skipTenant: true },
    );
    for (const resource of staleResources) {
      try {
        if (resource.driveFileId) {
          let driveDeleteSucceeded = false;
          try {
            await storageAdapter.deleteFiles(resource.ownerId, [
              resource.driveFileId,
            ]);
            driveDeleteSucceeded = true;
          } catch (err) {
            if (
              err.name === "TokenRevokedError" ||
              (err &&
                err.constructor &&
                err.constructor.name === "TokenRevokedError")
            ) {
              await UserModel.updateOne(
                { ownerId: resource.ownerId },
                { $unset: { driveRefreshToken: 1 } },
                { skipTenant: true },
              );
            }
            console.error(
              `Failed to delete orphan drive file ${resource.driveFileId}:`,
              err,
            );
          }
          if (!driveDeleteSucceeded) {
            continue;
          }
        }
        await ResourceModel.findByIdAndDelete(resource._id, {
          skipTenant: true,
        });
      } catch (err) {
        console.error("Failed to delete stale resource record", err);
      }
    }
    if (deleter) {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1e3);
      const staleProjects = await ProjectModel.find(
        { status: "deleting", updatedAt: { $lt: tenMinsAgo } },
        null,
        { skipTenant: true },
      );
      for (const proj of staleProjects) {
        await deleter
          .processProjectDeletion(proj._id, proj.ownerId)
          .catch(console.error);
      }
      const staleLists = await KnowledgeListModel.find(
        { status: "deleting", updatedAt: { $lt: tenMinsAgo } },
        null,
        { skipTenant: true },
      );
      for (const list of staleLists) {
        await deleter
          .processListDeletion(list._id, list.ownerId)
          .catch(console.error);
      }
      const staleDeletingResources = await ResourceModel.find(
        { status: "deleting", updatedAt: { $lt: tenMinsAgo } },
        null,
        { skipTenant: true },
      );
      for (const res of staleDeletingResources) {
        await deleter
          .processResourceDeletion(res._id, res.ownerId)
          .catch(console.error);
      }
    }
  } catch (error) {
    console.error("Garbage collection sweep failed:", error);
  } finally {
    isGCRunning = false;
  }
}

// src/plugins/gc.ts
var gcPlugin = fp8(
  async (fastify2, options) => {
    const intervalMs = options.intervalMs || 15 * 60 * 1e3;
    let intervalId;
    fastify2.addHook("onReady", async () => {
      fastify2.log.info(`Background GC scheduled every ${intervalMs}ms`);
      intervalId = setInterval(() => {
        runGarbageCollection(fastify2.storage, fastify2.deleter).catch((err) =>
          fastify2.log.error(err, "Background GC failed"),
        );
      }, intervalMs);
    });
    fastify2.addHook("onClose", async () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  },
  {
    name: "nexus-gc",
  },
);

// src/index.ts
import cookiePlugin from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
var fastify = Fastify({
  logger: true,
  routerOptions: { ignoreTrailingSlash: true, ignoreDuplicateSlashes: true },
}).withTypeProvider();
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);
fastify.register(errorHandlerPlugin);
fastify.register(cookiePlugin);
fastify.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
fastify.register(multipart, {
  attachFieldsToBody: false,
  limits: {
    fileSize: 14 * 1024 * 1024,
    // 14MB limit
  },
});
fastify.register(storagePlugin, {
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
});
fastify.register(deletionPlugin);
fastify.register(gcPlugin, { intervalMs: 15 * 60 * 1e3 });
fastify.addHook("onSend", async (_request, reply, payload) => {
  if (reply.getHeader("set-cookie")) {
    reply.header("Cache-Control", "no-store, max-age=0");
  }
  return payload;
});
fastify.addHook("onClose", async () => {
  await disconnectDB();
});
fastify.register(oauthProviderPlugin);
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
fastify.get("/health", async (_request, _reply) => {
  return { ok: true, version: "0.1.0" };
});
fastify.get("/api/protected", async (request, _reply) => {
  return { ok: true, user: request.ownerId };
});
var initPromise = null;
var init = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error("MONGODB_URI is not defined");
      }
      await connectDB(mongoUri);
      fastify.log.info("Connected to MongoDB");
      await fastify.ready();
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
};
if (!process.env.VERCEL) {
  init()
    .then(async () => {
      const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
      await fastify.listen({ port, host: "0.0.0.0" });
      console.log(`Server listening on port ${port}`);
    })
    .catch((err) => {
      fastify.log.error(err);
      process.exit(1);
    });
}
async function handler(req, res) {
  try {
    await init();
    fastify.server.emit("request", req, res);
  } catch (err) {
    fastify.log.error(err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
export { handler as default, fastify, init };
//# sourceMappingURL=server.mjs.map
