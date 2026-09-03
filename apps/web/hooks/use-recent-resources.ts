/**
 * @file use-recent-resources.ts
 * @description Hook to fetch the currently authenticated user's recently accessed resources.
 * @architecture Wraps the API call to provide an easy way to show recent activity on the dashboard.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { recentKeys } from "@/lib/query-keys";

/**
 * @desc Fetches recent resources for the dashboard view.
 * @returns React Query result
 */
export function useRecentResources() {
  return useQuery({
    queryKey: recentKeys.all(),
    queryFn: () => apiClient.user.recent(),
  });
}
