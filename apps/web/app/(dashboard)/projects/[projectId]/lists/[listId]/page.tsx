"use client";

/**
 * @file page.tsx
 * @description List detail page: resolves project/list ids from the URL and renders the list view.
 */
import { useParams } from "next/navigation";
import { ListPage } from "@/components/list-page";
import { useProject } from "@/hooks/use-projects";
import { useList } from "@/hooks/use-lists";
import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Render the list page or a not-found placeholder
 * @returns {JSX.Element} The list view
 */
export default function Page() {
  const { projectId, listId } = useParams<{
    projectId: string;
    listId: string;
  }>();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: list, isLoading: listLoading } = useList(projectId, listId);

  if (projectLoading || listLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="flex flex-col border-y border-[#dec9e9]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} name="resource-card" loading>
              {null}
            </Skeleton>
          ))}
        </div>
      </div>
    );
  }

  if (!project || !list)
    return <div className="py-20 text-center">List not found.</div>;

  return <ListPage project={project} list={list} />;
}
