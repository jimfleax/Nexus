"use client";

import { projectUrl, listUrl } from "@/lib/urls";
/**
 * @file resource-page.tsx
 * @description Resource reader page: breadcrumb, title/metadata header, favorite/edit/delete actions, and the type-specific viewer honoring reader settings.
 * @architecture Client component; marks the resource as opened on mount, resolves the reader width from context, and lazy-loads the edit dialog.
 */
import React, { useEffect } from "react";
import { useReaderSettings } from "@/components/reader-settings-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useProject } from "@/hooks/use-projects";
import { useList } from "@/hooks/use-lists";
import {
  useResource,
  useDeleteResource,
  useMarkOpened,
} from "@/hooks/use-resources";
import { ResourceViewer } from "@/components/resource-viewer";
import { Skeleton } from "boneyard-js/react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { capitalizeType } from "@/lib/resource-meta";
import { formatDate } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const EditResourceDialog = React.lazy(() =>
  import("@/components/resources/resource-dialog").then((mod) => ({
    default: mod.EditResourceDialog,
  })),
);

/**
 * @desc    Render the resource reader with breadcrumb, actions, and viewer
 * @param   {{projectId: string; listId: string; resourceId: string}} props - Route ids
 * @returns {JSX.Element} The resource page
 */
export function ResourcePage({
  projectId,
  listId,
  resourceId,
}: {
  projectId: string;
  listId: string;
  resourceId: string;
}) {
  const { favorites, toggle } = useFavorites();
  const { readerSettings } = useReaderSettings();
  const router = useRouter();
  const { mutate: deleteResource, isPending: isDeletingResource } =
    useDeleteResource();
  const { mutate: markOpened } = useMarkOpened();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: list, isLoading: listLoading } = useList(projectId, listId);
  const { data: resource, isLoading: resourceLoading } = useResource(
    projectId,
    listId,
    resourceId,
  );

  const width = {
    narrow: "max-w-2xl",
    standard: "max-w-3xl",
    wide: "max-w-4xl",
  }[readerSettings.width];

  useEffect(() => {
    if (resourceId) {
      markOpened(resourceId);
    }
  }, [resourceId, markOpened]);

  if (projectLoading || listLoading || resourceLoading) {
    return <Skeleton name="resource-page" />;
  }

  if (!project || !list || !resource) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="font-serif text-xl">Resource not found</h2>
        <p className="mt-2 text-sm text-[#6247aa]">
          This resource may have been deleted.
        </p>
      </div>
    );
  }

  return (
    <div className={`mx-auto ${width}`} data-boneyard="resource-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageBreadcrumb
          trail={[
            { label: project.name, href: projectUrl(project.id) },
            { label: list.name, href: listUrl(project.id, list.id) },
          ]}
          leaf={resource.title}
        />
        <div className="flex items-center gap-2">
          <React.Suspense fallback={<div className="w-[60px]" />}>
            <EditResourceDialog resource={resource}>
              <Button
                variant="outline"
                size="sm"
                className="border-[#dec9e9] text-[#6247aa] hover:bg-[#f8f4fb]"
              >
                Edit
              </Button>
            </EditResourceDialog>
          </React.Suspense>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggle(resource.id)}
                    className="text-xl text-[#6247aa] hover:text-[#6247aa] hover:bg-[#dec9e9]/30"
                    aria-label="Toggle favorite"
                  />
                }
              >
                {favorites.has(resource.id) ? "★" : "☆"}
              </TooltipTrigger>
              <TooltipContent>
                {favorites.has(resource.id)
                  ? "Remove from favorites"
                  : "Add to favorites"}
              </TooltipContent>
            </Tooltip>
            <ConfirmDialog
              title="Delete Resource"
              description="Are you sure you want to delete this resource?"
              isLoading={isDeletingResource}
              onConfirm={() =>
                deleteResource(resource.id, {
                  onSuccess: () => router.push(listUrl(project.id, list.id)),
                })
              }
              trigger={
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      />
                    }
                  >
                    <Trash className="size-5" />
                  </TooltipTrigger>
                  <TooltipContent>Delete resource</TooltipContent>
                </Tooltip>
              }
            />
          </div>
        </div>
      </div>
      <div className="mt-10 border-b border-[#dec9e9] pb-8">
        <h1 className="mt-2 font-serif text-4xl tracking-tight">
          {resource.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#6247aa]">
          <span>{capitalizeType(resource.type)}</span>
          <span>·</span>
          <span>Last updated {formatDate(resource.updatedAt)}</span>
          {resource.readingTime && (
            <>
              <span>·</span>
              <span>{resource.readingTime}</span>
            </>
          )}
          {resource.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-[#6247aa] px-2 py-0.5 text-xs text-white"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <ResourceViewer resource={resource} />
      </div>
    </div>
  );
}
