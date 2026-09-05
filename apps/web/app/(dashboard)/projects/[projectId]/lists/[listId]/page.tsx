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
        <Skeleton name="breadcrumb" loading>
          {null}
        </Skeleton>
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

  if (!project || !list) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="rounded-2xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-8 py-12 text-center max-w-md w-full">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dec9e9] mb-4">
            <svg
              className="h-6 w-6 text-[#6247aa]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-medium text-[#6247aa] mb-2">
            {!project ? "Project not found" : "List not found"}
          </h2>
          <p className="text-sm text-[#6247aa] mb-6">
            The {!project ? "project" : "list"} you are looking for does not
            exist or has been deleted.
          </p>
          <a
            href={!project ? "/home" : `/projects/${projectId}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#6247aa] px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#6247aa]/90"
          >
            Go back to {!project ? "Dashboard" : "Project"}
          </a>
        </div>
      </div>
    );
  }

  return <ListPage project={project} list={list} />;
}
