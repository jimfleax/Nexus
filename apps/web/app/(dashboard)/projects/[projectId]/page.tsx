/**
 * @file page.tsx
 * @description Project detail page: resolves the project id from the URL and renders the project view.
 */
"use client";
import { useParams } from "next/navigation";
import { ProjectPage } from "@/components/project-page";
import { useProject } from "@/hooks/use-projects";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @desc    Render the project page or a not-found placeholder
 * @returns {JSX.Element} The project view
 */
export default function Page() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="mt-8 h-40 w-full" />
      </div>
    );
  }

  if (!project)
    return <div className="py-20 text-center">Project not found.</div>;

  return <ProjectPage project={project} />;
}

