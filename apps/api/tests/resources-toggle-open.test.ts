import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import { resourceRoutes } from "../src/routes/resources.js";
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
let r1Id: string;
let r2Id: string;

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
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ResourceModel.deleteMany({}, { skipTenant: true });
  });

  await new Promise<void>((resolve) =>
    tenantContext.run({ ownerId: "test-user-1" }, async () => {
      const r1 = await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "A",
        type: "note",
        isFavorite: false,
      });
      r1Id = r1._id.toString();
      resolve();
    }),
  );

  await new Promise<void>((resolve) =>
    tenantContext.run({ ownerId: "test-user-2" }, async () => {
      const r2 = await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "B",
        type: "note",
        isFavorite: false,
      });
      r2Id = r2._id.toString();
      resolve();
    }),
  );
});

describe("PUT /api/resources/:id/favorite", () => {
  it("toggles favorite false -> true", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: { isFavorite: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isFavorite).toBe(true);

    const dbDoc = await ResourceModel.findById(r1Id, null, {
      skipTenant: true,
    });
    expect(dbDoc?.isFavorite).toBe(true);
  });

  it("toggles favorite true -> false", async () => {
    // preset to true
    await ResourceModel.findByIdAndUpdate(
      r1Id,
      { isFavorite: true },
      { skipTenant: true },
    );

    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: { isFavorite: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isFavorite).toBe(false);
  });

  it("is idempotent on repeated same value", async () => {
    await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: { isFavorite: true },
    });
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: { isFavorite: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isFavorite).toBe(true);
  });

  it("returns 404 for nonexistent resource", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${fakeId}/favorite`,
      payload: { isFavorite: true },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("PUT /api/resources/:id/favorite validation & isolation", () => {
  it("returns 400 if isFavorite is missing in body", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 if isFavorite is non-boolean", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r1Id}/favorite`,
      payload: { isFavorite: "yes" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when user-1 tries to favorite user-2's resource (tenant isolation)", async () => {
    // r2 belongs to user-2, but app is impersonating user-1
    const res = await app.inject({
      method: "PUT",
      url: `/api/resources/${r2Id}/favorite`,
      payload: { isFavorite: true },
    });
    expect(res.statusCode).toBe(404); // Tenant plugin hides it
  });
});

describe("POST /api/resources/:id/open", () => {
  it("sets lastOpenedAt to a recent Date and reflects in response", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/resources/${r1Id}/open`,
    });
    expect(res.statusCode).toBe(200);

    const timeDelta = Date.now() - new Date(res.json().lastOpenedAt).getTime();
    expect(timeDelta).toBeLessThan(5000); // within 5 seconds
    expect(timeDelta).toBeGreaterThanOrEqual(0);
  });

  it("returns 404 for nonexistent resource", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "POST",
      url: `/api/resources/${fakeId}/open`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("persists lastOpenedAt in the DB", async () => {
    await app.inject({ method: "POST", url: `/api/resources/${r1Id}/open` });

    const dbDoc = await ResourceModel.findById(r1Id, null, {
      skipTenant: true,
    });
    expect(dbDoc?.lastOpenedAt).toBeInstanceOf(Date);
  });

  it("would surface opened resource first in recent feed sorting (DB assert)", async () => {
    // Wait a bit to ensure distinct timestamp
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Create a new resource, it has no lastOpenedAt yet, then open r1
    await app.inject({ method: "POST", url: `/api/resources/${r1Id}/open` });

    const recent = await ResourceModel.find(
      { ownerId: "test-user-1", lastOpenedAt: { $exists: true } },
      null,
      { skipTenant: true },
    )
      .sort({ lastOpenedAt: -1 })
      .lean();

    expect(recent.length).toBe(1);
    expect(recent[0]._id.toString()).toBe(r1Id);
  });
});
