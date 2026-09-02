import "dotenv/config";
import Fastify from "fastify";
import { connectDB, tenantContext, tenantIsolationPlugin } from "./src/db.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const TestSchema = new mongoose.Schema({ name: String });
TestSchema.plugin(tenantIsolationPlugin);
const TestModel = mongoose.model("Test", TestSchema);

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  const app = Fastify();

  app.addHook("onRequest", (request, reply, done) => {
    tenantContext.run({ ownerId: "" }, () => done());
  });

  app.addHook("preHandler", async (request, reply) => {
    await new Promise((r) => setTimeout(r, 10));
    const store = tenantContext.getStore();
    console.log("Store in preHandler:", store);
    if (store) {
      store.ownerId = "user-123";
    }
  });

  app.get("/test", async () => {
    console.log("Store in route:", tenantContext.getStore());
    const docs = await TestModel.find();
    return { docs };
  });

  await app.ready();

  const response = await app.inject({ method: "GET", url: "/test" });
  console.log("Status:", response.statusCode);

  await mongoose.disconnect();
  await mongoServer.stop();
}

run().catch(console.error);
