import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "../api-client";
import { api } from "../axios";

describe("apiClient", () => {
  let getSpy: ReturnType<typeof vi.spyOn>;
  let postSpy: ReturnType<typeof vi.spyOn>;
  let patchSpy: ReturnType<typeof vi.spyOn>;
  let putSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSpy = vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    postSpy = vi.spyOn(api, "post").mockResolvedValue({ data: [] });
    patchSpy = vi.spyOn(api, "patch").mockResolvedValue({ data: [] });
    putSpy = vi.spyOn(api, "put").mockResolvedValue({ data: [] });
    void vi.spyOn(api, "delete").mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("projects", () => {
    it("list calls /projects", async () => {
      await apiClient.projects.list();
      expect(getSpy).toHaveBeenCalledWith("/projects");
    });

    it("get calls /projects/p1", async () => {
      await apiClient.projects.get("p1");
      expect(getSpy).toHaveBeenCalledWith("/projects/p1");
    });

    it("create calls POST /projects", async () => {
      await apiClient.projects.create({ name: "P" } as Parameters<
        typeof apiClient.projects.create
      >[0]);
      expect(postSpy).toHaveBeenCalledWith("/projects", { name: "P" });
    });
  });

  describe("lists", () => {
    it("reorder calls PATCH /projects/p1/lists/reorder", async () => {
      await apiClient.lists.reorder("p1", { items: [] });
      expect(patchSpy).toHaveBeenCalledWith("/projects/p1/lists/reorder", {
        items: [],
      });
    });
  });

  describe("resources", () => {
    it("list calls GET /projects/p1/lists/l1/resources", async () => {
      await apiClient.resources.list("p1", "l1");
      expect(getSpy).toHaveBeenCalledWith("/projects/p1/lists/l1/resources");
    });

    it("toggleFavorite calls PUT /resources/r1/favorite", async () => {
      await apiClient.resources.toggleFavorite("r1");
      expect(putSpy).toHaveBeenCalledWith("/resources/r1/favorite", {});
    });

    it("markOpened calls POST /resources/r1/open", async () => {
      await apiClient.resources.markOpened("r1");
      expect(postSpy).toHaveBeenCalledWith("/resources/r1/open", {});
    });
  });

  describe("user", () => {
    it("favorites calls GET /user/favorites", async () => {
      await apiClient.user.favorites();
      expect(getSpy).toHaveBeenCalledWith("/user/favorites");
    });

    it("metrics calls GET /user/metrics", async () => {
      await apiClient.user.metrics();
      expect(getSpy).toHaveBeenCalledWith("/user/metrics");
    });
  });

  describe("search", () => {
    it("query calls GET /search with params", async () => {
      await apiClient.search.query("q");
      expect(getSpy).toHaveBeenCalledWith("/search", { params: { q: "q" } });
    });

    it("suggestions calls GET /search/suggestions with params", async () => {
      await apiClient.search.suggestions("q");
      expect(getSpy).toHaveBeenCalledWith("/search/suggestions", {
        params: { q: "q" },
      });
    });
  });
});
