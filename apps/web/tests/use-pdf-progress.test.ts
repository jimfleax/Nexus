// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePdfProgress } from "../hooks/use-pdf-progress";
import { TestWrapper } from "./test-utils";
import { api } from "@/lib/axios";

vi.mock("@/lib/axios", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("usePdfProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch progress on mount if documentUrl is provided", async () => {
    const mockProgress = {
      documentUrl: "/test.pdf",
      currentPage: 5,
      maxPageReached: 5,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockProgress });

    const { result } = renderHook(() => usePdfProgress("/test.pdf"), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.progress).toEqual(mockProgress);
    });

    expect(api.get).toHaveBeenCalledWith("/progress", {
      params: { documentUrl: "/test.pdf" },
    });
  });

  it("should not fetch progress if documentUrl is missing", async () => {
    renderHook(() => usePdfProgress(undefined), { wrapper: TestWrapper });
    expect(api.get).not.toHaveBeenCalled();
  });

  it("should call post api when syncProgress is called", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    const { result } = renderHook(() => usePdfProgress("/test.pdf"), {
      wrapper: TestWrapper,
    });

    result.current.syncProgress({ currentPage: 2, maxPageReached: 2 });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/progress", {
        documentUrl: "/test.pdf",
        currentPage: 2,
        maxPageReached: 2,
      });
    });
  });
});
