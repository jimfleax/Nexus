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
import { Skeleton } from "boneyard-js/react";
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
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { projectUrl } from "@/lib/urls";

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
                <div className="mt-2">
                  <Skeleton name="text-line" loading>
                    {null}
                  </Skeleton>
                </div>
              ) : (
                <span className="mt-2 block text-sm text-[#6247aa]">
                  {items.length} {items.length === 1 ? "resource" : "resources"}
                </span>
              )}
            </>
          }
          actions={
            <div className="flex gap-2">
              <Suspense
                fallback={
                  <Skeleton name="button" loading>
                    {null}
                  </Skeleton>
                }
              >
                <CreateResourceDialog projectId={project.id} listId={list.id} />
              </Suspense>
              <Button
                variant="outline"
                size="lg"
                className="border-[#dec9e9] text-[#6247aa]"
              >
                Sort
              </Button>
              <Suspense
                fallback={
                  <Skeleton name="button" loading>
                    {null}
                  </Skeleton>
                }
              >
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
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} name="resource-card" loading>
                {null}
              </Skeleton>
            ))}
          </div>
        ) : items.length ? (
          items.map((item) => <ResourceCard key={item.id} resource={item} />)
        ) : (
          <EmptyState
            title="No resources yet"
            description="Create your first Markdown note or add a resource."
            action={
              <Suspense
                fallback={
                  <div className="mx-auto mt-4">
                    <Skeleton name="button" loading>
                      {null}
                    </Skeleton>
                  </div>
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
