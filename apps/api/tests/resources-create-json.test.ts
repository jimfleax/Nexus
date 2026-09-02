import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { resourceRoutes } from "../src/routes/resources.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ResourceModel } from "../src/models/Resource.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;
let testProject: string;
let testList: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    request.ownerId = "test-user-1";
    tenantContext.run({ ownerId: "test-user-1" }, () => done());
  });

  app.register(resourceRoutes);
  await app.ready();

  await new Promise<void>((resolve) =>
    tenantContext.run({ ownerId: "test-user-1" }, async () => {
      const project = await ProjectModel.create({ name: "Proj", slug: "proj" });
      const list = await KnowledgeListModel.create({
        projectId: project.id,
        name: "L1",
        slug: "l1",
        position: 0,
      });
      testProject = project._id.toString();
      testList = list._id.toString();
      resolve();
    }),
  );
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ResourceModel.deleteMany({});
  });
});
