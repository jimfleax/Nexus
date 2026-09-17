import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export function usePdfProgress(documentUrl?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pdf-progress", documentUrl],
    queryFn: async () => {
      if (!documentUrl) return null;
      const res = await api.get("/progress", { params: { documentUrl } });
      return res.data;
    },
    enabled: !!documentUrl,
  });

  const mutation = useMutation({
    mutationFn: async ({
      currentPage,
      maxPageReached,
    }: {
      currentPage: number;
      maxPageReached: number;
    }) => {
      if (!documentUrl) return;
      await api.post("/progress", {
        documentUrl,
        currentPage,
        maxPageReached,
      });
    },
    onMutate: async ({ currentPage, maxPageReached }) => {
      // Optimistic update
      if (!documentUrl) return;
      await queryClient.cancelQueries({
        queryKey: ["pdf-progress", documentUrl],
      });
      const previousProgress = queryClient.getQueryData([
        "pdf-progress",
        documentUrl,
      ]);

      queryClient.setQueryData(
        ["pdf-progress", documentUrl],
        (old: unknown) => {
          const oldProgress = old as Record<string, unknown> | undefined;
          return {
            ...oldProgress,
            documentUrl,
            currentPage,
            maxPageReached,
          };
        },
      );
      return { previousProgress };
    },
    onError: (err, newProgress, context) => {
      if (context?.previousProgress && documentUrl) {
        queryClient.setQueryData(
          ["pdf-progress", documentUrl],
          context.previousProgress,
        );
      }
    },
    onSettled: () => {
      if (documentUrl) {
        queryClient.invalidateQueries({
          queryKey: ["pdf-progress", documentUrl],
        });
      }
    },
  });

  return {
    progress: query.data,
    isLoading: query.isLoading,
    syncProgress: mutation.mutate,
  };
}
