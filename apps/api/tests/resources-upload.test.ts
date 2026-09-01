import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { connectDB } from "../src/db.js";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { tenantContext } from "../src/db.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { storagePlugin } from "../src/utils/storage/plugin.js";
import { FakeStorageAdapter } from "../src/utils/storage/fake.js";
import { deletionPlugin } from "../src/plugins/deletion.js";
import multipart from "@fastify/multipart";
import FormData from "form-data";
import fs from "fs";
import path from "path";

let mongoServer: MongoMemoryServer;
let app: any;
let fakeStorage: FakeStorageAdapter;

describe("Resources Multipart Upload", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await connectDB(mongoServer.getUri());

    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    app.register(multipart);

    app.decorateRequest("ownerId", null);
    fakeStorage = new FakeStorageAdapter();
    app.register(storagePlugin, { adapter: fakeStorage });
    app.register(deletionPlugin);

    // Setup tenant context for each request
    app.addHook("onRequest", (request: any, reply: any, done: any) => {
      request.ownerId = "test-user-1";
      tenantContext.run({ ownerId: "test-user-1" }, () => {
        done();
      }, 60000);
    }, 60000);

    app.register(resourceRoutes);
    await app.ready();

    const listId = new mongoose.Types.ObjectId().toHexString();
    const projectId = new mongoose.Types.ObjectId().toHexString();

    await new Promise<void>((resolve) =>
      tenantContext.run({ ownerId: "test-user-1" }, async () => {
        await KnowledgeListModel.create({
          _id: listId,
          projectId: projectId,
          name: "Test List",
          slug: "test-list",
          position: 0,
        }, 60000);
        resolve();
      }),
    );
    app.decorate("testContext", { listId, projectId });
  }, 60000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  }, 60000);

  it("POST /api/resources accepts multipart and streams to storage", async () => {
    const { listId, projectId } = app.testContext;
    const form = new FormData();
    form.append("projectId", projectId);
    form.append("listId", listId);
    form.append("title", "Test Upload");
    form.append("type", "pdf");
    form.append("file", Buffer.from("fake pdf content"), {
      filename: "test.pdf",
      contentType: "application/pdf",
    }, 60000);

    const response = await app.inject({
      method: "POST",
      url: "/api/resources",
      headers: form.getHeaders(),
      payload: form.getBuffer(),
    }, 60000);

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.payload);
    
    expect(data.title).toBe("Test Upload");
    expect(data.driveFileId).toMatch(/^fake-file-/);
    expect(data.size).toBe(Buffer.from("fake pdf content").length);
    expect(data.status).toBe("ready");

    // Verify it was stored in the fake adapter
    const uploadMeta = fakeStorage.uploads.get(data.driveFileId);
    expect(uploadMeta).toBeDefined();
    expect(uploadMeta?.title).toBe("Test Upload");
    expect(uploadMeta?.mimeType).toBe("application/pdf");
  }, 60000);
});
