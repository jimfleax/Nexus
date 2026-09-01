/**
 * @file use-resources.ts
 * @description TanStack Query hooks for resource data fetching and mutations.
 * @architecture Wraps apiClient resource calls, keying queries by project/list/resource and invalidating the resource cache after mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateResourceInput, UpdateResourceInput } from "@nexus/shared";

/**
 * @desc    Query all resources in a project's list
 * @param   {string} projectId - Project ID
 * @param   {string} listId - List ID
 */
export function useResources(projectId: string, listId: string) {
  return useQuery({
    queryKey: ["resources", projectId, listId],
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
    queryKey: ["resources", projectId, listId, resourceId],
    queryFn: () => apiClient.resources.get(resourceId),
    enabled: !!resourceId,
  });
}

/**
 * @desc    Mutation that creates a resource in a list and invalidates the list's resource cache
 */
export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      listId,
      input,
    }: {
      projectId: string;
      listId: string;
      input: CreateResourceInput & { file?: File; mimeType?: string };
    }) => apiClient.resources.create(projectId, listId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["resources", variables.projectId, variables.listId],
      });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

/**
 * @desc    Mutation that updates a resource and invalidates the resource cache
 */
export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resourceId,
      input,
    }: {
      resourceId: string;
      input: UpdateResourceInput;
    }) => apiClient.resources.update(resourceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

/**
 * @desc    Mutation that deletes a resource and invalidates the resource cache
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => apiClient.resources.delete(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

/**
 * @desc    Mutation that finalizes a Drive upload for a resource and invalidates the resource cache
 */

/**
 * @desc    Mutation to mark a resource as opened
 */
export function useMarkOpened() {
  return useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.resources.markOpened(resourceId),
  });
}
