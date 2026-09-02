/**
 * @file use-user-metrics.ts
 * @description TanStack Suspense-enabled hook for fetching user storage metrics.
 * @architecture Uses a suspending query so the settings page can render while metrics load.
 */

import { useSuspenseQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

import { metricsKeys } from "@/lib/query-keys";

/**
 * @desc    Query the current user's storage and count metrics
 */
export function useUserMetrics() {
  return useSuspenseQuery({
    queryKey: metricsKeys.all(),
    queryFn: () => apiClient.user.metrics(),
  });
}
