"use client";

/**
 * @file list-page.tsx
 * @description Knowledge-list detail view: breadcrumb, header with create/edit/delete actions, and the resource list.
 * @architecture Client component; lazy-loads create/edit dialogs and renders resources via ResourceCard.
 */
import React, { Suspense } from "react";
import type { KnowledgeList, Project } from "@nexus/shared";
import { ResourceCard } from "@/components/resource-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/data-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { useResources } from "@/hooks/use-resources";
import { useRouter } from "next/navigation";
import { useDeleteList } from "@/hooks/use-lists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const CreateResourceDialog = React.lazy(() =>
  import("@/components/resources/resource-dialog").then((mod) => ({
    default: mod.CreateResourceDialog,
  })),
);
const EditListDialog = React.lazy(() =>
  import("@/components/lists/list-dialog").then((mod) => ({
    default: mod.EditListDialog,
  })),
);

/**
 * @desc    Render the list header, actions, and resource items
 * @param   {{project: Project; list: KnowledgeList}} props - Project and list context
 * @returns {JSX.Element} The list page
 */
export function ListPage({
  project,
  list,
}: {
  project: Project;
  list: KnowledgeList;
}) {
  const { data: items = [], isLoading } = useResources(project.id, list.id);
  const router = useRouter();
  const { mutate: deleteList, isPending: isDeletingList } = useDeleteList();

  return (
    <>
      <div className="border-b border-[#dec9e9] pb-7">
        <PageBreadcrumb
          trail={[{ label: project.name, href: projectUrl(project.id) }]}
          leaf={list.name}
        />
        <PageHeader
          className="mt-5 border-none pb-0"
          title={list.name}
          subtitle={
            <>
              {list.description && (
                <span className="mt-2 block max-w-2xl text-[#6247aa]">
                  {list.description}
                </span>
              )}
              {isLoading ? (
                <Skeleton className="mt-2 h-4 w-24" />
              ) : (
                <span className="mt-2 block text-sm text-[#6247aa]">
                  {items.length} {items.length === 1 ? "resource" : "resources"}
                </span>
              )}
            </>
          }
          actions={
            <div className="flex gap-2">
              <Suspense fallback={<Skeleton className="h-[38px] w-[130px]" />}>
                <CreateResourceDialog projectId={project.id} listId={list.id} />
              </Suspense>
              <Button
                variant="outline"
                size="lg"
                className="border-[#dec9e9] text-[#6247aa]"
              >
                Sort
              </Button>
              <Suspense fallback={<Skeleton className="h-[38px] w-[80px]" />}>
                <EditListDialog list={list}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[#dec9e9] text-[#6247aa]"
                  >
                    Edit
                  </Button>
                </EditListDialog>
              </Suspense>
              <ConfirmDialog
                title="Delete List"
                description="Are you sure you want to delete this list? This action cannot be undone."
                isLoading={isDeletingList}
                onConfirm={() =>
                  deleteList(
                    { projectId: project.id, listId: list.id },
                    { onSuccess: () => router.push(projectUrl(project.id)) },
                  )
                }
                trigger={
                  <Tooltip>
                    <TooltipTrigger
                      render={<Button variant="destructive" size="icon-lg" />}
                    >
                      <Trash className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Delete List</TooltipContent>
                  </Tooltip>
                }
              />
            </div>
          }
        />
      </div>
      <div className="mt-3 max-w-4xl">
        {isLoading ? (
          <ListSkeleton />
        ) : items.length ? (
          items.map((item, index) => (
            <ResourceCard key={item.id} resource={item} index={index} />
          ))
        ) : (
          <EmptyState
            title="No resources yet"
            description="Create your first Markdown note or add a resource."
            action={
              <Suspense
                fallback={
                  <Skeleton className="h-[38px] w-[130px] mx-auto mt-4" />
                }
              >
                <CreateResourceDialog projectId={project.id} listId={list.id} />
              </Suspense>
            }
          />
        )}
      </div>
    </>
  );
}
