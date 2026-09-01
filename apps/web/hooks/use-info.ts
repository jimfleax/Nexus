import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
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
  enabled: boolean = true
) {
  return useQuery<InfoDto>({
    queryKey: ["info", type, id],
    queryFn: async () => {
      const response = await api.get("/info", {
        params: { type, id },
      });
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}
