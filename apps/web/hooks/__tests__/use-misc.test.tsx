// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../use-favorites";
import { useUserMetrics } from "../use-user-metrics";
import { TestWrapper } from "../../tests/test-utils";
import { apiClient } from "../../lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    user: { favorites: vi.fn(), metrics: vi.fn() },
    search: { query: vi.fn(), suggestions: vi.fn() },
    info: { get: vi.fn() }, // Assuming info is here, adjust if needed
  },
}));

describe("Misc queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useFavorites queries", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiClient.user.favorites).mockResolvedValue([] as any);
    const { result } = renderHook(() => useFavorites(), {
      wrapper: TestWrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(apiClient.user.favorites).toHaveBeenCalledTimes(1);
  });

  it("useUserMetrics queries", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(apiClient.user.metrics).mockResolvedValue({} as any);
    const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper>
        <React.Suspense fallback={<div>Loading</div>}>
          {children}
        </React.Suspense>
      </TestWrapper>
    );
    const { result } = renderHook(() => useUserMetrics(), {
      wrapper: SuspenseWrapper,
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(apiClient.user.metrics).toHaveBeenCalledTimes(1);
  });
});
