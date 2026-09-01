/**
 * @file page.tsx
 * @description Recent page: lists recently opened resources with a create-resource dialog in the header.
 */
"use client";

import { ResourceCard } from "@/components/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/data-skeletons";
import { CreateResourceDialog } from "@/components/resources/create-resource-dialog";
import { Clock } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

/**
 * @desc    Render the recent resources list with loading and empty states
 * @returns {JSX.Element} Page header plus resource cards
 */
export default function RecentPage() {
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["recentResources"],
    queryFn: () => apiClient.user.recent(),
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dec9e9] pb-7">
        <div>
          <h1 className="font-serif text-4xl tracking-tight">Recent</h1>
          <p className="mt-2 text-[#6247aa]">
            Continue reading where you left off.
          </p>
        </div>
        <CreateResourceDialog />
      </div>

      <div className="mt-6 max-w-4xl border-y border-[#dec9e9]">
        {isLoading ? (
          <ListSkeleton />
        ) : resources.length ? (
          resources.map((r, index) => (
            <ResourceCard key={r.id} resource={r} index={index} />
          ))
        ) : (
          <EmptyState
            icon={Clock}
            title="No resources yet"
            description="Add a resource to start building your library."
          />
        )}
      </div>
    </>
  );
}
