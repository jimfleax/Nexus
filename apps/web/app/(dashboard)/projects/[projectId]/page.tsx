"use client";

/**
 * @file page.tsx
 * @description Project detail page: resolves the project id from the URL and renders the project view.
 */
import { useParams } from "next/navigation";
import { ProjectPage } from "@/components/project-page";
import { useProject } from "@/hooks/use-projects";
import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Render the project page or a not-found placeholder
 * @returns {JSX.Element} The project view
 */
export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} name="project-list-card" loading />
          ))}
        </div>
      </div>
    );
  }

  if (!project)
    return <div className="py-20 text-center">Project not found.</div>;

  return <ProjectPage project={project} />;
}
