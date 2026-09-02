// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "../use-projects";
import { TestWrapper } from "../../tests/test-utils";
import { apiClient } from "../../lib/api-client";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    projects: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // stub other namespaces just in case
    lists: {},
    resources: {},
    user: {},
    search: {},
  },
}));

describe("use-projects hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useProjects", () => {
    it("calls apiClient.projects.list() and returns data", async () => {
      const mockProjects = [{ id: "p1", name: "P1" }];
      vi.mocked(apiClient.projects.list).mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useProjects(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockProjects);
      expect(apiClient.projects.list).toHaveBeenCalledTimes(1);
    });
  });

  describe("useProject", () => {
    it("is disabled when id is falsy and enabled when provided", async () => {
      vi.mocked(apiClient.projects.get).mockResolvedValue({ id: "p1" } as any);

      const { result, rerender } = renderHook(({ id }) => useProject(id), {
        initialProps: { id: "" },
        wrapper: TestWrapper,
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe("idle"); // disabled
      expect(apiClient.projects.get).not.toHaveBeenCalled();

      rerender({ id: "p1" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.projects.get).toHaveBeenCalledWith("p1");
    });
  });

  describe("mutations and invalidation", () => {
    it("useCreateProject calls create and invalidates ['projects']", async () => {
      // Mock both mutation and the refetch
      vi.mocked(apiClient.projects.create).mockResolvedValue({
        id: "p2",
      } as any);
      vi.mocked(apiClient.projects.list).mockResolvedValue([
        { id: "p1" },
        { id: "p2" },
      ] as any);

      // We need to render a component that uses BOTH the query and mutation to see refetch
      const { result } = renderHook(
        () => {
          const queryClient = useQueryClient();
          const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
          const projects = useProjects();
          const create = useCreateProject();
          return { projects, create, invalidateSpy };
        },
        { wrapper: TestWrapper },
      );

      await waitFor(() => expect(result.current.projects.isSuccess).toBe(true));
      expect(apiClient.projects.list).toHaveBeenCalledTimes(1);

      result.current.create.mutate({ name: "New" } as any);

      await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
      expect(apiClient.projects.create).toHaveBeenCalledWith({ name: "New" });

      // Invalidate is called
      expect(result.current.invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects"],
      });
    });

    it("useUpdateProject calls update and invalidates list and detail keys", async () => {
      vi.mocked(apiClient.projects.update).mockResolvedValue({
        id: "p1",
      } as any);

      const { result } = renderHook(
        () => {
          const queryClient = useQueryClient();
          const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
          const update = useUpdateProject();
          return { update, invalidateSpy };
        },
        { wrapper: TestWrapper },
      );

      result.current.update.mutate({ id: "p1", input: { name: "Upd" } });

      await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
      expect(apiClient.projects.update).toHaveBeenCalledWith("p1", {
        name: "Upd",
      });

      expect(result.current.invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects"],
      });
      expect(result.current.invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects", "p1"],
      });
    });

    it("useDeleteProject calls delete and removes detail key", async () => {
      vi.mocked(apiClient.projects.delete).mockResolvedValue(undefined as any);

      const { result } = renderHook(
        () => {
          const queryClient = useQueryClient();
          const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
          const removeSpy = vi.spyOn(queryClient, "removeQueries");
          const del = useDeleteProject();
          return { del, invalidateSpy, removeSpy };
        },
        { wrapper: TestWrapper },
      );

      result.current.del.mutate("p1");

      await waitFor(() => expect(result.current.del.isSuccess).toBe(true));
      expect(apiClient.projects.delete).toHaveBeenCalledWith("p1");

      expect(result.current.invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects"],
      });
      expect(result.current.removeSpy).toHaveBeenCalledWith({
        queryKey: ["projects", "p1"],
      });
    });
  });
});
