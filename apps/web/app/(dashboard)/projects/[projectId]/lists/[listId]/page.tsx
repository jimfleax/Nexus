/**
 * @file page.tsx
 * @description List detail page: resolves project/list ids from the URL and renders the list view.
 */
"use client";
import { useParams } from "next/navigation";
import { ListPage } from "@/components/list-page";
import { useProject } from "@/hooks/use-projects";
import { useList } from "@/hooks/use-lists";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/ui/data-skeletons";

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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="mt-8">
          <ListSkeleton />
        </div>
      </div>
    );
  }

  if (!project || !list)
    return <div className="py-20 text-center">List not found.</div>;

  return <ListPage project={project} list={list} />;
}
