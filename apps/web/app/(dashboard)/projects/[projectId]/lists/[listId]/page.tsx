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
    return <Skeleton name="list-page" />;
  }

  if (!project || !list)
    return <div className="py-20 text-center">List not found.</div>;

  return <ListPage project={project} list={list} />;
}
