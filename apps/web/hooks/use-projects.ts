/**
 * @file use-projects.ts
 * @description TanStack Query hooks for project data fetching and mutations.
 * @architecture Wraps apiClient project calls with cache keys and invalidation so pages stay in sync after CRUD mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateProjectInput, UpdateProjectInput } from "@nexus/shared";
import { projectKeys } from "@/lib/query-keys";
import { useCacheInvalidatingMutation } from "./use-cache-mutation";

/**
 * @desc    Query all projects
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all(),
    queryFn: () => apiClient.projects.list(),
  });
}

/**
 * @desc    Query a single project by ID
 * @param   {string} id - Project ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiClient.projects.get(id),
    enabled: !!id,
  });
}

/**
 * @desc    Mutation that creates a project and invalidates the project list
 */
export function useCreateProject() {
  return useCacheInvalidatingMutation({
    mutationFn: (input: CreateProjectInput) => apiClient.projects.create(input),
    invalidate: [projectKeys.all()],
  });
}

/**
 * @desc    Mutation that updates a project and refreshes the affected cache entries
 */
export function useUpdateProject() {
  return useCacheInvalidatingMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      apiClient.projects.update(id, input),
    invalidate: (variables) => [
      projectKeys.all(),
      projectKeys.detail(variables.id),
    ],
  });
}

/**
 * @desc    Mutation that deletes a project and evicts its cached data
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.projects.delete(id),
    onSuccess: (data, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}
