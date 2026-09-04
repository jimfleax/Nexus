"use client";
import { projectUrl } from "@/lib/urls";
/**
 * @file page.tsx
 * @description Projects page: grid of the user's projects as animated magic cards with a lazy-loaded create dialog.
 */

import React, { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "boneyard-js/react";
import { MagicContainer, MagicCard } from "@/components/ui/magic-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useProjects } from "@/hooks/use-projects";
import { useLists } from "@/hooks/use-lists";
import type { Project } from "@nexus/shared";

const CreateProjectDialog = React.lazy(() =>
  import("@/components/projects/project-dialog").then((mod) => ({
    default: mod.CreateProjectDialog,
  })),
);

/**
 * @desc    Render a single project as a linkable magic card showing its collection count
 * @param   {{p: Project}} props - The project to display
 * @returns {JSX.Element} The project card
 */
function ProjectItem({ p }: { p: Project }) {
  const { data: lists = [] } = useLists(p.id);
  const listCount = lists.length;
  return (
    <MagicCard
      as={Link}
      href={projectUrl(p.id)}
      key={p.id}
      enableStars={true}
      enableTilt={true}
      enableMagnetism={true}
      clickEffect={true}
      className="group flex flex-col justify-between rounded-2xl border border-[#dec9e9] bg-white p-5 transition hover:shadow-xs"
      data-boneyard="project-card"
    >
      <div>
        <span className="text-xl text-[#6247aa]">{p.icon}</span>
        <h2 className="mt-3 font-medium text-[#6247aa] group-hover:text-[#815ac0]">
          {p.name}
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#6247aa]">{p.description}</p>
      </div>
      <p className="mt-4 text-xs text-[#815ac0]">
        {listCount} {listCount === 1 ? "collection" : "collections"}
      </p>
    </MagicCard>
  );
}

/**
 * @desc    Render the projects grid, header, and create dialog
 * @returns {JSX.Element} Page header plus the project grid
 */
export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Your knowledge contexts, collected in one place."
        actions={
          <Suspense
            fallback={
              <Skeleton name="button" loading>
                {null}
              </Skeleton>
            }
          >
            <CreateProjectDialog />
          </Suspense>
        }
      />

      {isLoading || projects.length > 0 ? (
        <MagicContainer
          className="mt-8 grid gap-4 sm:grid-cols-2"
          glowColor="129, 90, 192"
        >
          {(isLoading
            ? (Array.from({ length: 4 }) as unknown[])
            : projects
          ).map((item, i) => {
            const isDummy = isLoading;
            return (
              <Skeleton key={i} name="project-card" loading={isLoading}>
                {isDummy ? (
                  <div style={{ minHeight: 180 }} />
                ) : (
                  <ProjectItem p={item as Project} />
                )}
              </Skeleton>
            );
          })}
        </MagicContainer>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organizing your knowledge contexts."
          action={
            <Suspense
              fallback={
                <Skeleton name="button" loading>
                  {null}
                </Skeleton>
              }
            >
              <CreateProjectDialog />
            </Suspense>
          }
          className="mt-12"
        />
      )}
    </>
  );
}
