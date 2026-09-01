/**
 * @file use-lists.ts
 * @description TanStack Query hooks for knowledge-list data fetching and mutations.
 * @architecture Wraps apiClient list calls with per-project cache keys and invalidates dependent queries after mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateKnowledgeListInput,
  UpdateKnowledgeListInput,
  ReorderKnowledgeListInput,
} from "@nexus/shared";

/**
 * @desc    Query all lists in a project
 * @param   {string} projectId - Project ID
 */
export function useLists(projectId: string) {
  return useQuery({
    queryKey: ["lists", projectId],
    queryFn: () => apiClient.lists.list(projectId),
    enabled: !!projectId,
  });
}

/**
 * @desc    Query a single list within a project
 * @param   {string} projectId - Project ID
 * @param   {string} listId - List ID
 */
export function useList(projectId: string, listId: string) {
  return useQuery({
    queryKey: ["lists", projectId, listId],
    queryFn: () => apiClient.lists.get(projectId, listId),
    enabled: !!projectId && !!listId,
  });
}

/**
 * @desc    Mutation that creates a list in a project and invalidates its list cache
 */
export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: CreateKnowledgeListInput;
    }) => apiClient.lists.create(projectId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lists", variables.projectId],
      });
    },
  });
}

/**
 * @desc    Mutation that updates a list and refreshes the project and single-list caches
 */
export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      listId,
      input,
    }: {
      projectId: string;
      listId: string;
      input: UpdateKnowledgeListInput;
    }) => apiClient.lists.update(projectId, listId, input),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lists", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["lists", variables.projectId, variables.listId],
      });
    },
  });
}

/**
 * @desc    Mutation that deletes a list and invalidates the project's list cache
 */
export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      listId,
    }: {
      projectId: string;
      listId: string;
    }) => apiClient.lists.delete(projectId, listId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lists", variables.projectId],
      });
    },
  });
}

/**
 * @desc    Mutation that reorders lists and invalidates the project's list cache
 */
export function useReorderLists() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: ReorderKnowledgeListInput;
    }) => apiClient.lists.reorder(projectId, input),
    // Optimistic update can be added here if needed, but invalidation is fine for now
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lists", variables.projectId],
      });
    },
  });
}
