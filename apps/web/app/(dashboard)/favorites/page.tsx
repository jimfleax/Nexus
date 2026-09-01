/**
 * @file page.tsx
 * @description Favorites page: lists the user's starred resources fetched from the backend.
 */
"use client";

import { ResourceCard } from "@/components/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/data-skeletons";
import { Star } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

/**
 * @desc    Render the favorites list with loading and empty states
 * @returns {JSX.Element} Page header plus resource cards
 */
export default function FavoritesPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiClient.user.favorites(),
  });

  return (
    <>
      <div className="border-b border-[#dec9e9] pb-7">
        <h1 className="font-serif text-4xl tracking-tight">Favorites</h1>
        <p className="mt-2 text-[#6247aa]">Resources you want close at hand.</p>
      </div>

      <div className="mt-6 max-w-4xl border-y border-[#dec9e9]">
        {isLoading ? (
          <ListSkeleton />
        ) : items.length ? (
          items.map((r, index) => (
            <ResourceCard key={r.id} resource={r} index={index} />
          ))
        ) : (
          <EmptyState
            icon={Star}
            title="No favorites yet"
            description="Star a resource from any list to keep it pinned here."
          />
        )}
      </div>
    </>
  );
}
