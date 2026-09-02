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
    return <Skeleton name="project-page" />;
  }

  if (!project)
    return <div className="py-20 text-center">Project not found.</div>;

  return <ProjectPage project={project} />;
}
