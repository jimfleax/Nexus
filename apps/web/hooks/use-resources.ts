/**
 * @file use-resources.ts
 * @description TanStack Query hooks for resource data fetching and mutations.
 * @architecture Wraps apiClient resource calls, keying queries by project/list/resource and invalidating the resource cache after mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateResourceInput, UpdateResourceInput } from "@nexus/shared";
import { resourceKeys, recentKeys } from "@/lib/query-keys";
import { useCacheInvalidatingMutation } from "./use-cache-mutation";

/**
 * @desc    Query all resources in a project's list
 * @param   {string} projectId - Project ID
 * @param   {string} listId - List ID
 */
export function useResources(projectId: string, listId: string) {
  return useQuery({
    queryKey: resourceKeys.byProjectAndList(projectId, listId),
    queryFn: () => apiClient.resources.list(projectId, listId),
    enabled: !!projectId && !!listId,
  });
}

/**
 * @desc    Query a single resource
 * @param   {string} projectId - Project ID
 * @param   {string} listId - List ID
 * @param   {string} resourceId - Resource ID
 */
export function useResource(
  projectId: string,
  listId: string,
  resourceId: string,
) {
  return useQuery({
    queryKey: resourceKeys.detail(projectId, listId, resourceId),
    queryFn: () => apiClient.resources.get(resourceId),
    enabled: !!resourceId,
  });
}

/**
 * @desc    Mutation that creates a resource in a list and invalidates the list's resource cache
 */
export function useCreateResource() {
  return useCacheInvalidatingMutation({
    mutationFn: ({
      projectId,
      listId,
      input,
    }: {
      projectId: string;
      listId: string;
      input: CreateResourceInput & { file?: File; mimeType?: string };
    }) => apiClient.resources.create(projectId, listId, input),
    invalidate: (variables) => [
      resourceKeys.byProjectAndList(variables.projectId, variables.listId),
      resourceKeys.all(),
    ],
  });
}

/**
 * @desc    Mutation that updates a resource and invalidates the resource cache
 */
export function useUpdateResource() {
  return useCacheInvalidatingMutation({
    mutationFn: ({
      resourceId,
      input,
    }: {
      resourceId: string;
      input: UpdateResourceInput;
    }) => apiClient.resources.update(resourceId, input),
    invalidate: [resourceKeys.all()],
  });
}

/**
 * @desc    Mutation that deletes a resource and invalidates the resource cache
 */
export function useDeleteResource() {
  return useCacheInvalidatingMutation({
    mutationFn: (resourceId: string) => apiClient.resources.delete(resourceId),
    invalidate: [resourceKeys.all()],
  });
}

/**
 * @desc    Mutation to mark a resource as opened
 */
export function useMarkOpened() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.resources.markOpened(resourceId),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: recentKeys.all() });
    },
  });
}
