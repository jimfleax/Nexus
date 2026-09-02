// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useResources,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useMarkOpened,
} from "../use-resources";
import { TestWrapper } from "../../tests/test-utils";
import { resourceKeys, recentKeys } from "@/lib/query-keys";
import { apiClient } from "../../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    resources: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      markOpened: vi.fn(),
    },
    projects: {},
    lists: {},
    user: {},
    search: {},
  },
}));

describe("use-resources hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useResources disabled when missing ids", async () => {
    const { result } = renderHook(() => useResources("p1", ""), {
      wrapper: TestWrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(apiClient.resources.list).not.toHaveBeenCalled();
  });

  it("useResource disabled when missing resourceId", async () => {
    const { result } = renderHook(() => useResource("p1", "l1", ""), {
      wrapper: TestWrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(apiClient.resources.get).not.toHaveBeenCalled();
  });

  it("useCreateResource invalidates specific list resources and all resources", async () => {
    vi.mocked(apiClient.resources.create).mockResolvedValue({
      id: "r1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { result } = renderHook(
      () => {
        const qc = useQueryClient();
        return {
          create: useCreateResource(),
          spy: vi.spyOn(qc, "invalidateQueries"),
        };
      },
      { wrapper: TestWrapper },
    );

    result.current.create.mutate({
      projectId: "p1",
      listId: "l1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: {} as any,
    });
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));

    expect(result.current.spy).toHaveBeenCalledWith({
      queryKey: resourceKeys.byProjectAndList("p1", "l1"),
    });
    expect(result.current.spy).toHaveBeenCalledWith({
      queryKey: resourceKeys.all(),
    });
  });

  it("useUpdateResource invalidates resources", async () => {
    vi.mocked(apiClient.resources.update).mockResolvedValue({
      id: "r1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { result } = renderHook(
      () => {
        const qc = useQueryClient();
        return {
          update: useUpdateResource(),
          spy: vi.spyOn(qc, "invalidateQueries"),
        };
      },
      { wrapper: TestWrapper },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.current.update.mutate({ resourceId: "r1", input: {} as any });
    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));

    expect(result.current.spy).toHaveBeenCalledWith({
      queryKey: resourceKeys.all(),
    });
  });

  it("useDeleteResource invalidates resources", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiClient.resources.delete).mockResolvedValue(undefined as any);
    const { result } = renderHook(
      () => {
        const qc = useQueryClient();
        return {
          del: useDeleteResource(),
          spy: vi.spyOn(qc, "invalidateQueries"),
        };
      },
      { wrapper: TestWrapper },
    );

    result.current.del.mutate("r1");
    await waitFor(() => expect(result.current.del.isSuccess).toBe(true));

    expect(result.current.spy).toHaveBeenCalledWith({
      queryKey: resourceKeys.all(),
    });
  });

  it("useMarkOpened calls markOpened and invalidates recent feed", async () => {
    vi.mocked(apiClient.resources.markOpened).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undefined as any,
    );
    const { result } = renderHook(
      () => {
        const qc = useQueryClient();
        return {
          mark: useMarkOpened(),
          spy: vi.spyOn(qc, "invalidateQueries"),
        };
      },
      { wrapper: TestWrapper },
    );

    result.current.mark.mutate("r1");
    await waitFor(() => expect(result.current.mark.isSuccess).toBe(true));

    expect(apiClient.resources.markOpened).toHaveBeenCalledWith("r1");
    expect(result.current.spy).toHaveBeenCalledWith({
      queryKey: recentKeys.all(),
    });
  });
});
