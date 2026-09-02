import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

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
