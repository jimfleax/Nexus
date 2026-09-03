/**
 * @file use-cache-mutation.ts
 * @description Provides a custom hook for React Query mutations that automatically invalidate cache keys.
 * @architecture Abstraction over `useMutation` to standardize cache clearing on success, keeping UI state synchronized.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

/**
 * @desc Executes a mutation and invalidates specified React Query keys upon success.
 * @param {Object} params
 * @param {Function} params.mutationFn - The async function that performs the mutation
 * @param {Function|QueryKey[]} params.invalidate - Array of query keys or a function returning query keys to invalidate
 * @returns React Query mutation object
 */
export function useCacheInvalidatingMutation<TVariables, TData>({
  mutationFn,
  invalidate,
}: {
  mutationFn: (v: TVariables) => Promise<TData>;
  invalidate: ((v: TVariables) => QueryKey[]) | QueryKey[];
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      const keys =
        typeof invalidate === "function" ? invalidate(variables) : invalidate;
      return Promise.all(
        keys.map((k) => queryClient.invalidateQueries({ queryKey: k })),
      );
    },
  });
}
