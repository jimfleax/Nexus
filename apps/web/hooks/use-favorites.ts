/**
 * @file use-favorites.ts
 * @description TanStack Query hook that tracks the favorite set and toggles it with optimistic updates.
 * @architecture Combines a favorites query with a toggle mutation that optimistically removes entries and rolls back on error.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { favoriteKeys } from "@/lib/query-keys";

/**
 * @desc    Hook returning the favorite resource IDs and a toggle handler
 */
export function useFavorites() {
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: favoriteKeys.all(),
    queryFn: () => apiClient.user.favorites(),
  });

  const favorites = new Set(resources.map((r) => r.id));

  const toggleMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiClient.resources.toggleFavorite(resourceId),
    onMutate: async (resourceId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all() });
      const previousFavorites = queryClient.getQueryData(favoriteKeys.all());

      queryClient.setQueryData(
        favoriteKeys.all(),
        (old: { id: string }[] | undefined) => {
          if (!old) return old;
          const exists = old.some((r: { id: string }) => r.id === resourceId);
          if (exists) {
            return old.filter((r: { id: string }) => r.id !== resourceId);
          }
          // Since we don't have the full resource here, we just invalidate later
          return old;
        },
      );

      return { previousFavorites };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(favoriteKeys.all(), context?.previousFavorites);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });

  return {
    favorites,
    resources,
    isLoading,
    toggle: (id: string) => toggleMutation.mutate(id),
  };
}
