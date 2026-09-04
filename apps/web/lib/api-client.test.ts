/**
 * @file api-client.test.ts
 * @description Tests for the typed API client in lib/api-client.ts.
 * @architecture Mocks the underlying axios instance to verify request shapes
 *              without making real HTTP calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mock variables are available when vi.mock is hoisted
const { mockGet, mockPost, mockPatch, mockPut, mockDelete } = vi.hoisted(
  () => ({
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockPatch: vi.fn(),
    mockPut: vi.fn(),
    mockDelete: vi.fn(),
  }),
);

vi.mock("./axios", () => ({
  api: {
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    put: mockPut,
    delete: mockDelete,
  },
}));

import { apiClient } from "./api-client";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ data: [] });
  mockPost.mockResolvedValue({ data: {} });
  mockPatch.mockResolvedValue({ data: {} });
  mockPut.mockResolvedValue({ data: {} });
  mockDelete.mockResolvedValue({ data: null });
});

describe("apiClient.projects", () => {
  it("list() should GET /projects", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "1", name: "P1" }] });
    const result = await apiClient.projects.list();
    expect(mockGet).toHaveBeenCalledWith("/projects");
    expect(result).toEqual([{ id: "1", name: "P1" }]);
  });

  it("get(id) should GET /projects/:id", async () => {
    mockGet.mockResolvedValue({ data: { id: "123", name: "Test" } });
    const result = await apiClient.projects.get("123");
    expect(mockGet).toHaveBeenCalledWith("/projects/123");
    expect(result).toEqual({ id: "123", name: "Test" });
  });

  it("create(input) should POST /projects with body", async () => {
    const input = { name: "New Project", description: "Desc" };
    mockPost.mockResolvedValue({ data: { id: "456", ...input } });
    const result = await apiClient.projects.create(input);
    expect(mockPost).toHaveBeenCalledWith("/projects", input);
    expect(result.id).toBe("456");
  });

  it("update(id, input) should PATCH /projects/:id with body", async () => {
    const input = { name: "Updated" };
    mockPatch.mockResolvedValue({ data: { id: "123", ...input } });
    await apiClient.projects.update("123", input);
    expect(mockPatch).toHaveBeenCalledWith("/projects/123", input);
  });

  it("delete(id) should DELETE /projects/:id", async () => {
    await apiClient.projects.delete("123");
    expect(mockDelete).toHaveBeenCalledWith("/projects/123");
  });
});

describe("apiClient.lists", () => {
  it("list(projectId) should GET /projects/:projectId/lists", async () => {
    await apiClient.lists.list("proj-1");
    expect(mockGet).toHaveBeenCalledWith("/projects/proj-1/lists");
  });

  it("create(projectId, input) should POST /projects/:projectId/lists", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { name: "New List" } as any;
    mockPost.mockResolvedValue({ data: { id: "l1", ...input } });
    const result = await apiClient.lists.create("proj-1", input);
    expect(mockPost).toHaveBeenCalledWith("/projects/proj-1/lists", input);
    expect(result.id).toBe("l1");
  });

  it("update(projectId, listId, input) should PATCH", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { name: "Updated List" } as any;
    await apiClient.lists.update("proj-1", "list-1", input);
    expect(mockPatch).toHaveBeenCalledWith("/lists/list-1", input);
  });

  it("delete(projectId, listId) should DELETE", async () => {
    await apiClient.lists.delete("proj-1", "list-1");
    expect(mockDelete).toHaveBeenCalledWith("/lists/list-1");
  });

  it("reorder(projectId, input) should PUT reorder endpoint", async () => {
    const input = { items: [{ id: "l1", position: 1 }] };
    await apiClient.lists.reorder("proj-1", input);
    expect(mockPut).toHaveBeenCalledWith(
      "/projects/proj-1/lists/reorder",
      input,
    );
  });
});

describe("apiClient.resources", () => {
  it("list(projectId, listId) should GET resources endpoint", async () => {
    await apiClient.resources.list("proj-1", "list-1");
    expect(mockGet).toHaveBeenCalledWith("/projects/proj-1/resources", {
      params: { listId: "list-1" },
    });
  });

  it("get(resourceId) should GET /resources/:id", async () => {
    await apiClient.resources.get("res-1");
    expect(mockGet).toHaveBeenCalledWith("/resources/res-1");
  });

  it("create with file should POST multipart", async () => {
    const file = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = {
      projectId: "proj-1",
      listId: "list-1",
      title: "Test",
      type: "pdf" as const,
      file,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPost.mockResolvedValue({ data: { id: "r1" } });
    await apiClient.resources.create("proj-1", "list-1", input);

    expect(mockPost).toHaveBeenCalledWith("/resources", expect.any(FormData), {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // TDD: Ensure fields are not duplicated into arrays
    const formData = mockPost.mock.calls[0][1] as FormData;
    expect(formData.getAll("projectId")).toEqual(["proj-1"]);
    expect(formData.getAll("listId")).toEqual(["list-1"]);
  });

  it("create without file should POST JSON with projectId/listId", async () => {
    const input = {
      title: "Note",
      type: "note" as const,
      content: "Hello",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPost.mockResolvedValue({ data: { id: "r2" } });
    await apiClient.resources.create("proj-1", "list-1", input);

    expect(mockPost).toHaveBeenCalledWith("/resources", {
      ...input,
      projectId: "proj-1",
      listId: "list-1",
    });
  });

  it("update(resourceId, input) should PATCH /resources/:id", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input = { title: "Updated" } as any;
    await apiClient.resources.update("res-1", input);
    expect(mockPatch).toHaveBeenCalledWith("/resources/res-1", input);
  });

  it("delete(resourceId) should DELETE /resources/:id", async () => {
    await apiClient.resources.delete("res-1");
    expect(mockDelete).toHaveBeenCalledWith("/resources/res-1");
  });

  it("toggleFavorite(resourceId) should PUT with empty body", async () => {
    mockPut.mockResolvedValue({ data: { id: "res-1", isFavorite: true } });
    const result = await apiClient.resources.toggleFavorite("res-1");
    expect(mockPut).toHaveBeenCalledWith("/resources/res-1/favorite", {});
    expect(result.isFavorite).toBe(true);
  });

  it("markOpened(resourceId) should POST with empty body", async () => {
    await apiClient.resources.markOpened("res-1");
    expect(mockPost).toHaveBeenCalledWith("/resources/res-1/open", {});
  });
});

describe("apiClient.user", () => {
  it("favorites() should GET /user/favorites", async () => {
    await apiClient.user.favorites();
    expect(mockGet).toHaveBeenCalledWith("/user/favorites");
  });

  it("recent() should GET /user/recent", async () => {
    await apiClient.user.recent();
    expect(mockGet).toHaveBeenCalledWith("/user/recent");
  });

  it("metrics() should GET /user/metrics", async () => {
    mockGet.mockResolvedValue({
      data: { usedByNexus: 100, resourceCount: 5 },
    });
    const result = await apiClient.user.metrics();
    expect(mockGet).toHaveBeenCalledWith("/user/metrics");
    expect(result.usedByNexus).toBe(100);
  });
});

describe("apiClient.search", () => {
  it("query(q) should GET /search with params", async () => {
    await apiClient.search.query("test query");
    expect(mockGet).toHaveBeenCalledWith("/search", {
      params: { q: "test query" },
    });
  });

  it("suggestions(q) should GET /search/suggestions with params", async () => {
    await apiClient.search.suggestions("hello");
    expect(mockGet).toHaveBeenCalledWith("/search/suggestions", {
      params: { q: "hello" },
    });
  });
});
