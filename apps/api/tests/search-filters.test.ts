import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { searchRoutes } from "../src/routes/search.js";
import { tenantContext, connectDB } from "../src/db.js";
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

let p1Id = new mongoose.Types.ObjectId().toHexString();
let p2Id = new mongoose.Types.ObjectId().toHexString();
let listId = new mongoose.Types.ObjectId().toHexString();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
  await ResourceModel.init(); // MUST run to create $text index

  app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest("ownerId", null);
  app.addHook("onRequest", (request: any, reply: any, done: any) => {
    const ownerId = request.headers["x-test-owner"] || "user-1";
    request.ownerId = ownerId;
    tenantContext.run({ ownerId }, () => done());
  });

  app.register(searchRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ResourceModel.deleteMany({}, { skipTenant: true });

  await tenantContext.run({ ownerId: "user-1" }, async () => {
    // P1 resources
    await ResourceModel.create({
      projectId: p1Id,
      listId,
      ownerId: "user-1",
      title: "Solar Energy Basics",
      type: "pdf",
      isFavorite: true,
      lastOpenedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
      updatedAt: new Date(Date.now() - 86400000),
    });

    await ResourceModel.create({
      projectId: p1Id,
      listId,
      ownerId: "user-1",
      title: "Photovoltaic Solar Panels Guide",
      type: "markdown",
      isFavorite: false,
      lastOpenedAt: new Date(Date.now() - 3600000), // 1 hour ago
      updatedAt: new Date(),
    });

    // P2 resources
    await ResourceModel.create({
      projectId: p2Id,
      listId,
      title: "Quantum Computing Primer",
      type: "note",
      isFavorite: true,
      lastOpenedAt: new Date(Date.now() - 300000), // 5 min ago
      updatedAt: new Date(Date.now() - 3600000),
    });
  });

  await tenantContext.run({ ownerId: "user-2" }, async () => {
    await ResourceModel.create({
      projectId: p1Id,
      listId,
      title: "Solar for Beginners",
      type: "pdf",
      isFavorite: true,
      lastOpenedAt: new Date(),
    });
  });
});

describe("Search and Suggestions", () => {
  it("basic text search returns current tenant's matches only", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search?q=solar" });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(2); // Solar Energy Basics (title) & Photovoltaic Solar Panels Guide (content)
    const titles = data.map((d: any) => d.title);
    expect(titles).not.toContain("Solar for Beginners"); // User-2 isolated
  });

  it("filters search by projectId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/search?q=quantum&projectId=${p2Id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);

    const resEmpty = await app.inject({
      method: "GET",
      url: `/api/search?q=quantum&projectId=${p1Id}`,
    });
    expect(resEmpty.statusCode).toBe(200);
    expect(resEmpty.json().length).toBe(0);
  });

  it("returns 400 for empty search q", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search?q=" });
    expect(res.statusCode).toBe(400);
  });

  it("sorts search by textScore relevance", async () => {
    // "Solar Energy Basics" (title match = high score) vs "Photovoltaic Solar Panels Guide" (content "solar" = low score)
    const res = await app.inject({ method: "GET", url: "/api/search?q=solar" });
    const data = res.json();
    expect(data[0].title).toBe("Solar Energy Basics");
    expect(data[1].title).toBe("Photovoltaic Solar Panels Guide");
  });

  it("omits content from search results", async () => {
    const res = await app.inject({ method: "GET", url: "/api/search?q=solar" });
    expect(res.json()[0]).not.toHaveProperty("content");
  });

  it("returns suggestions by regex substring case-insensitive", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search/suggestions?q=sola",
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(2);
    // ordered by natural insertion order
    expect(data[0].title).toBe("Solar Energy Basics");
    expect(data[1].title).toBe("Photovoltaic Solar Panels Guide");
  });

  it("filters suggestions by projectId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/search/suggestions?q=quan&projectId=${p2Id}`,
    });
    expect(res.json().length).toBe(1);
  });

  it("returns exactly id, title, type for suggestions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search/suggestions?q=solar",
    });
    const keys = Object.keys(res.json()[0]).sort();
    expect(keys).toEqual(["id", "title", "type"]);
  });

  it("returns 400 for empty suggestion q", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/search/suggestions?q=",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Favorites and Recent", () => {
  it("returns only favorites, ordered by updatedAt desc", async () => {
    const res = await app.inject({ method: "GET", url: "/api/favorites" });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(2); // Solar Energy Basics (p1) & Quantum Computing (p2)
    // Quantum updated 1 hour ago, Solar Energy updated 1 day ago
    expect(data[0].title).toBe("Quantum Computing Primer");
    expect(data[1].title).toBe("Solar Energy Basics");
    expect(data[0]).not.toHaveProperty("content");
  });

  it("filters favorites by projectId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/favorites?projectId=${p2Id}`,
    });
    expect(res.json().length).toBe(1);
    expect(res.json()[0].title).toBe("Quantum Computing Primer");
  });

  it("isolates favorites per tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/favorites",
      headers: { "x-test-owner": "user-2" },
    });
    expect(res.json().length).toBe(1);
    expect(res.json()[0].title).toBe("Solar for Beginners");
  });

  it("returns recently opened resources, ordered by lastOpenedAt desc", async () => {
    const res = await app.inject({ method: "GET", url: "/api/recent" });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(3);
    // order: 5 min ago, 1 hour ago, 3 days ago
    expect(data[0].title).toBe("Quantum Computing Primer");
    expect(data[1].title).toBe("Photovoltaic Solar Panels Guide");
    expect(data[2].title).toBe("Solar Energy Basics");
    expect(data[0]).not.toHaveProperty("content");
  });

  it("filters recent by projectId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/recent?projectId=${p1Id}`,
    });
    expect(res.json().length).toBe(2);
  });

  it("isolates recent per tenant", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/recent",
      headers: { "x-test-owner": "user-2" },
    });
    expect(res.json().length).toBe(1);
  });

  it("limits recent to 20 items", async () => {
    await tenantContext.run({ ownerId: "user-1" }, async () => {
      const docs = Array.from({ length: 25 }, (_, i) => ({
        projectId: p1Id,
        listId,
        title: `Bulk ${i}`,
        type: "note",
        lastOpenedAt: new Date(),
      }));
      await ResourceModel.insertMany(docs);
    });

    const res = await app.inject({ method: "GET", url: "/api/recent" });
    expect(res.json().length).toBe(20);
  });
});
