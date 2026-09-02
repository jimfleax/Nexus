"use client";

/**
 * @file page.tsx
 * @description Favorites page: lists the user's starred resources fetched from the backend.
 */
import { PageHeader } from "@/components/ui/page-header";
import { Star } from "@phosphor-icons/react";
import { useFavorites } from "@/hooks/use-favorites";
import { ResourceList } from "@/components/ui/resource-list";

/**
 * @desc    Render the favorites list with loading and empty states
 * @returns {JSX.Element} Page header plus resource cards
 */
export default function FavoritesPage() {
  const { resources: items = [], isLoading } = useFavorites();

  return (
    <>
      <PageHeader
        title="Favorites"
        subtitle="Resources you want close at hand."
      />

      <ResourceList
        items={items}
        isLoading={isLoading}
        emptyIcon={Star}
        emptyTitle="No favorites yet"
        emptyDescription="Star a resource from any list to keep it pinned here."
      />
    </>
  );
}
