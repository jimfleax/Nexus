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
import { resourceRoutes } from "../src/routes/resources.js";
import { tenantContext, connectDB } from "../src/db.js";
import { ProjectModel } from "../src/models/Project.js";
import { KnowledgeListModel } from "../src/models/KnowledgeList.js";
import { ResourceModel } from "../src/models/Resource.js";
import { UserModel } from "../src/models/User.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  validatorCompiler,
  serializerCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockReturnValue({
        setCredentials: vi.fn(),
        getAccessToken: vi.fn().mockResolvedValue({ token: "fake-at" }),
      }),
    },
    drive: vi.fn(),
  },
}));

const getAccessTokenMock = vi.fn().mockResolvedValue({ token: "fake-at" });
const oauth2ClientMock = {
  setCredentials: vi.fn(),
  getAccessToken: getAccessTokenMock,
};

import { google } from "googleapis";
vi.mocked(google.auth.OAuth2).mockImplementation(function () {
  return oauth2ClientMock;
} as any);

const originalFetch = global.fetch;
let fetchMock = vi.fn();
global.fetch = fetchMock as any;

let mongoServer: MongoMemoryServer;
let app: ReturnType<typeof Fastify>;

let pId: string;
let p2Id: string;
let lAId: string;
let lBId: string;
let rAId: string;
let rBId: string;

const deleteResource = vi.fn().mockResolvedValue(undefined);

beforeAll(async () => {
  process.env.AUTH_GOOGLE_ID = "test-id";
  process.env.AUTH_GOOGLE_SECRET = "test-secret";
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());

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
    deleteResource,
    deleteList: vi.fn(),
    deleteProject: vi.fn(),
  });
  app.register(resourceRoutes);
  await app.ready();
}, 60000);

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongoServer.stop();
  global.fetch = originalFetch;
});

beforeEach(async () => {
  deleteResource.mockClear();
  fetchMock.mockClear();
  getAccessTokenMock.mockResolvedValue({ token: "fake-at" });

  await UserModel.deleteMany({}); // not tenant scoped

  await tenantContext.run({ ownerId: "test-user-1" }, async () => {
    await ProjectModel.deleteMany({}, { skipTenant: true });
    await KnowledgeListModel.deleteMany({}, { skipTenant: true });
    await ResourceModel.deleteMany({}, { skipTenant: true });

    const p = await ProjectModel.create({ name: "Proj", slug: "proj" });
    pId = p._id.toString();

    const p2 = await ProjectModel.create({ name: "Proj2", slug: "proj2" });
    p2Id = p2._id.toString();

    const a = await KnowledgeListModel.create({
      projectId: pId,
      name: "ListA",
      slug: "lista",
      position: 0,
    });
    lAId = a._id.toString();

    const b = await KnowledgeListModel.create({
      projectId: p2Id,
      name: "ListB",
      slug: "listb",
      position: 0,
    });
    lBId = b._id.toString();

    const ra = await ResourceModel.create({
      projectId: pId,
      listId: lAId,
      title: "ResA",
      type: "pdf",
      mimeType: "application/pdf",
      size: 100,
      status: "ready",
      readingTime: "5 min",
      driveFileId: "file-1",
      content: "opaque",
    });
    rAId = ra._id.toString();

    const rb = await ResourceModel.create({
      projectId: pId,
      listId: lAId,
      title: "ResB",
      type: "markdown",
      content: "# hello",
    });
    rBId = rb._id.toString();
  });
});

describe("Listing, Content and DELETE", () => {
  it("lists resources in project without content field", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${pId}/resources`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.length).toBe(2);
    expect(data[0]).not.toHaveProperty("content");
    expect(data[1]).not.toHaveProperty("content");
  });

  it("filters by listId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${pId}/resources?listId=${lAId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(2);
  });

  it("returns empty array for project with no resources", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${p2Id}/resources`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("returns raw text content with text/plain", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/resources/${rBId}/content`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.payload).toBe("# hello");
  });

  it("returns empty string when content is absent or opaque", async () => {
    // For ResA, content is "opaque" in DB
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/resources/${rAId}/content`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe("opaque");
  });

  it("returns 404 for nonexistent content", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/resources/${fakeId}/content`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("isolates list by project (tenant)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${pId}/resources`,
      headers: { "x-test-owner": "test-user-2" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("returns 404 and doesn't call deleter for nonexistent DELETE", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/resources/${fakeId}`,
    });
    expect(res.statusCode).toBe(404);
    expect(deleteResource).not.toHaveBeenCalled();
  });

  it("returns 204 and calls deleter on happy DELETE", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/resources/${rAId}`,
    });
    expect(res.statusCode).toBe(204);
    expect(deleteResource).toHaveBeenCalledWith(rAId, "test-user-1");
  });
});

describe("PATCH errors", () => {
  it("returns 404 moving to nonexistent list", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/resources/${rAId}`,
      payload: { listId: fakeId },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 when rename collides with existing title in project", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/resources/${rBId}`,
      payload: { title: "ResA" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe(
      "A resource with this name already exists in the project",
    );
  });

  it("allows patching to same title (excludes self)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/resources/${rAId}`,
      payload: { title: "ResA" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("overrides projectId when moving to a list in another project", async () => {
    // move rA (pId) to lB (p2Id)
    const res = await app.inject({
      method: "PATCH",
      url: `/api/resources/${rAId}`,
      payload: { listId: lBId },
    });
    expect(res.statusCode).toBe(200);
    const updated = await ResourceModel.findById(rAId, null, {
      skipTenant: true,
    });
    expect(updated?.projectId).toBe(p2Id);
  });

  it("returns 404 PATCHing nonexistent resource", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/resources/${fakeId}`,
      payload: { title: "X" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Drive File Streaming", () => {
  it("returns 400 when Drive is not configured (no token)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rAId}/file`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Google Drive not configured");
  });

  it("returns 404 for resource without driveFileId", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok",
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rBId}/file`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("streams file successfully and copies headers", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok",
    });
    const headers = new Headers();
    headers.set("content-type", "application/pdf");
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("pdf-bytes"));
          c.close();
        },
      }),
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rAId}/file`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBe('inline; filename="ResA"'); // default applied
    expect(res.headers["accept-ranges"]).toBe("bytes");
    expect(res.payload).toBe("pdf-bytes");
  });

  it("forwards Range request and handles 206", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok",
    });
    const headers = new Headers();
    headers.set("content-range", "bytes 0-9/100");
    fetchMock.mockResolvedValue({
      ok: true,
      status: 206,
      headers,
      body: new ReadableStream({
        start(c) {
          c.close();
        },
      }),
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rAId}/file`,
      headers: { Range: "bytes=0-9" },
    });

    expect(res.statusCode).toBe(206);
    expect(res.headers["content-range"]).toBe("bytes 0-9/100");
    expect(fetchMock.mock.calls[0][1].headers.Range).toBe("bytes=0-9"); // verified forwarded
  });

  it("passes through Drive errors", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok",
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      headers: new Headers(),
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rAId}/file`,
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("Failed to fetch file from Drive");
  });

  it("returns 404 for nonexistent resource file request", async () => {
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${fakeId}/file`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("propagates OAuth access token failure", async () => {
    await UserModel.create({
      ownerId: "test-user-1",
      driveRefreshToken: "tok",
    });
    getAccessTokenMock.mockRejectedValue(new Error("OAuth fail"));

    const res = await app.inject({
      method: "GET",
      url: `/api/resources/${rAId}/file`,
    });
    expect(res.statusCode).toBe(500);
  });
});
