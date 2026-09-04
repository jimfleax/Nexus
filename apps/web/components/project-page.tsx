"use client";

/**
 * @file project-page.tsx
 * @description Project detail view: breadcrumb, header with create/delete actions, and the ordered list of collections with reordering.
 * @architecture Client component; lazy-loads create dialogs and swaps list positions locally before persisting via useReorderLists.
 */
import React, { Suspense } from "react";
import type { Project } from "@nexus/shared";
import { Skeleton } from "boneyard-js/react";

import { useLists, useReorderLists } from "@/hooks/use-lists";
import { ProjectListCard } from "@/components/project-list-card";
import { useRouter } from "next/navigation";
import { useDeleteProject } from "@/hooks/use-projects";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const CreateListDialog = React.lazy(() =>
  import("@/components/lists/list-dialog").then((mod) => ({
    default: mod.CreateListDialog,
  })),
);
const CreateResourceDialog = React.lazy(() =>
  import("@/components/resources/resource-dialog").then((mod) => ({
    default: mod.CreateResourceDialog,
  })),
);

/**
 * @desc    Render the project header, actions, and ordered collection list
 * @param   {{project: Project}} props - The project to display
 * @returns {JSX.Element} The project page
 */
export function ProjectPage({ project }: { project: Project }) {
  const { data: collections = [], isLoading } = useLists(project.id);
  const { mutate: reorderLists } = useReorderLists();
  const router = useRouter();
  const { mutate: deleteProject, isPending: isDeletingProject } =
    useDeleteProject();

  const handleReorder = (index: number, direction: "up" | "down") => {
    const newLists = [...collections];
    if (direction === "up" && index > 0) {
      const temp = newLists[index - 1].position;
      newLists[index - 1].position = newLists[index].position;
      newLists[index].position = temp;
    } else if (direction === "down" && index < newLists.length - 1) {
      const temp = newLists[index + 1].position;
      newLists[index + 1].position = newLists[index].position;
      newLists[index].position = temp;
    }

    reorderLists({
      projectId: project.id,
      input: {
        items: newLists.map((l) => ({ id: l.id, position: l.position })),
      },
    });
  };

  return (
    <>
      <div className="mb-6">
        <PageBreadcrumb trail={[]} leaf={project.name} />
      </div>
      <PageHeader
        className="pb-8"
        kicker={<div className="text-xl text-[#6247aa]">{project.icon}</div>}
        title={<span className="mt-2 block">{project.name}</span>}
        subtitle={
          <span className="mt-3 block max-w-2xl leading-6">
            {project.description}
          </span>
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
              <CreateResourceDialog
                projectId={project.id}
                disabled={collections.length === 0}
              />
            </Suspense>
            <Suspense
              fallback={
                <Skeleton name="button" loading>
                  {null}
                </Skeleton>
              }
            >
              <CreateListDialog projectId={project.id} />
            </Suspense>
            <ConfirmDialog
              title="Delete Project"
              description="Are you sure you want to delete this project? This action cannot be undone."
              isLoading={isDeletingProject}
              onConfirm={() =>
                deleteProject(project.id, {
                  onSuccess: () => router.push("/projects"),
                })
              }
              trigger={
                <Button variant="destructive" size="lg" className="gap-2">
                  <Trash className="size-4" />
                  Delete
                </Button>
              }
            />
          </div>
        }
      />
      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl">
          Collections{" "}
          <span className="text-base font-normal text-[#6247aa]">
            {!isLoading && `(${collections.length})`}
          </span>
        </h2>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} name="project-list-card" loading>
                {null}
              </Skeleton>
            ))}
          </div>
        ) : collections.length ? (
          <div className="flex flex-col gap-2">
            {collections.map((list, index) => (
              <ProjectListCard
                key={list.id}
                project={project}
                list={list}
                index={index}
                total={collections.length}
                onReorder={handleReorder}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-[#dec9e9] rounded-2xl">
            <h3 className="font-serif text-lg text-[#6247aa]">
              No collections yet
            </h3>
            <p className="mt-1 text-sm text-[#815ac0]">
              Create a collection to organize your resources.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
