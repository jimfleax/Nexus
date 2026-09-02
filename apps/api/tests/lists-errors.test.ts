import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import Fastify from "fastify";
import { listRoutes } from "../src/routes/lists.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;
let pId: string;
let p2Id: string;
let lAId: string;
let lBId: string;

const deleteList = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
  await KnowledgeListModel.init();

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    const ownerId = request.headers["x-test-owner"] || "test-user-1";
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.decorate("deleter", {
    deleteList,
    deleteProject: vi.fn(),
    deleteResource: vi.fn(),
  });
  app.register(listRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  deleteList.mockClear();

  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ProjectModel.deleteMany({}, { skipTenant: true });
    await KnowledgeListModel.deleteMany({}, { skipTenant: true });

    const p = await ProjectModel.create({ name: "Proj", slug: "proj" });
    pId = p._id.toString();

    const p2 = await ProjectModel.create({ name: "Proj2", slug: "proj2" });
    p2Id = p2._id.toString();

    const a = await KnowledgeListModel.create({
      projectId: pId,
      name: "A",
      slug: "a",
      position: 0,
    });
    lAId = a._id.toString();

    const b = await KnowledgeListModel.create({
      projectId: pId,
      name: "B",
      slug: "b",
      position: 1,
    });
    lBId = b._id.toString();
  });
});
