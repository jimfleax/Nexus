import "dotenv/config";
import Fastify from "fastify";
import { connectDB, tenantContext, tenantIsolationPlugin } from "./src/db.js";
import { authPlugin, verifyToken } from "./src/auth.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { SignJWT } from "jose";

const TestSchema = new mongoose.Schema({ name: String });
TestSchema.plugin(tenantIsolationPlugin);
const TestModel = mongoose.model("Test", TestSchema);

async function run() {
  const mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

  const app = Fastify();

  // same logic as authPlugin
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request, reply, done) => {
    tenantContext.run({ ownerId: "" }, () => done());
  });

  app.addHook("preHandler", async (request, reply) => {
    // Simulate an async operation like verifyToken
    await new Promise((r) => setTimeout(r, 10));
    const store = tenantContext.getStore();
    if (store) {
      store.ownerId = "user-123";
    }
  });

  app.get("/test", async () => {
    // This should fail because context is lost after the async preHandler
    const docs = await TestModel.find();
    return { docs };
  });

  await app.ready();

  const response = await app.inject({ method: "GET", url: "/test" });
  console.log("Status:", response.statusCode);
  console.log("Payload:", response.payload);

  await mongoose.disconnect();
  await mongoServer.stop();
}

run().catch(console.error);
