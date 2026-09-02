"use client";

/**
 * @file page.tsx
 * @description Recent page: lists recently opened resources with a create-resource dialog in the header.
 */
import { PageHeader } from "@/components/ui/page-header";
import { CreateResourceDialog } from "@/components/resources/resource-dialog";
import { Clock } from "@phosphor-icons/react";
import { useRecentResources } from "@/hooks/use-recent-resources";
import { ResourceList } from "@/components/ui/resource-list";

/**
 * @desc    Render the recent resources list with loading and empty states
 * @returns {JSX.Element} Page header plus resource cards
 */
export default function RecentPage() {
  const { data: resources = [], isLoading } = useRecentResources();

  return (
    <>
      <PageHeader
        title="Recent"
        subtitle="Continue reading where you left off."
        actions={<CreateResourceDialog />}
      />

      <ResourceList
        items={resources}
        isLoading={isLoading}
        emptyIcon={Clock}
        emptyTitle="No resources yet"
        emptyDescription="Add a resource to start building your library."
      />
    </>
  );
}
