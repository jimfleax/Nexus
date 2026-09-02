import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { recentKeys } from "@/lib/query-keys";

export function useRecentResources() {
  return useQuery({
    queryKey: recentKeys.all(),
    queryFn: () => apiClient.user.recent(),
  });
}
