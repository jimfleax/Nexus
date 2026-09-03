/**
 * @file use-info.ts
 * @description Hook to fetch global info metadata for a given entity.
 * @architecture Abstraction over React Query for info fetching, preventing duplicated query keys.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { infoKeys } from "@/lib/query-keys";
import { STALE_MEDIUM } from "@/lib/query-config";
import type { InfoDto } from "@nexus/shared";

/**
 * @desc    Fetch info metadata for a project, list, or resource
 * @param   {string} type - 'project', 'list', or 'resource'
 * @param   {string} id - The ID of the item
 * @param   {boolean} enabled - Whether the query is enabled (e.g. only when modal is open)
 * @returns React Query result with InfoDto
 */
export function useInfo(
  type: "project" | "list" | "resource",
  id: string,
  enabled: boolean = true,
) {
  return useQuery<InfoDto>({
    queryKey: infoKeys.byTypeAndId(type, id),
    queryFn: () => apiClient.info.get(type, id),
    enabled: enabled && !!id,
    staleTime: STALE_MEDIUM,
  });
}
