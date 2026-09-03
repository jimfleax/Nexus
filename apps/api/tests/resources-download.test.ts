import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { resourceRoutes } from "../src/routes/resources.js";
import { ResourceModel } from "../src/models/Resource.js";
import {
  createTestApp,
  teardownTestApp,
  TestAppContext,
  inTenant,
} from "./helpers.js";

describe("GET /api/resources/:id/file", () => {
  let ctx: TestAppContext;
  let resourceId: string;

  beforeAll(async () => {
    ctx = await createTestApp({ routes: [resourceRoutes] });

    const res = await inTenant("test-user-1", async () => {
      return await ResourceModel.create({
        projectId: "p1",
        listId: "l1",
        title: "Test File.pdf",
        type: "pdf",
        driveFileId: "drive-123",
        ownerId: "test-user-1",
      });
    });
    resourceId = res.id;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  it("should stream file using storage adapter", async () => {
    vi.spyOn(ctx.app.storage, "getFileStream");

    const response = await ctx.app.inject({
      method: "GET",
      url: `/api/resources/${resourceId}/file`,
      headers: {
        range: "bytes=0-100",
      },
    });

    expect(ctx.app.storage.getFileStream).toHaveBeenCalledWith(
      "test-user-1",
      "drive-123",
      "bytes=0-100",
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("fake file content");
    expect(response.headers["content-disposition"]).toBe(
      'inline; filename="fake.txt"',
    );
  });
});
