"use client";

import { projectUrl } from "@/lib/urls";
/**
 * @file project-card.tsx
 * @description Compact animated project card used on the dashboard hero.
 * @architecture Client component wrapping the project in a MagicCard link with star/tilt/magnetism effects.
 */
import Link from "next/link";
import { MagicCard } from "@/components/ui/magic-card";
import type { Project } from "@nexus/shared";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";

/**
 * @desc    Render a project as an animated linkable card
 * @param   {{p: Project}} props - The project to display
 * @returns {JSX.Element} The project card
 */
export function ProjectCard({ p }: { p: Project & { listCount?: number } }) {
  const listCount = p.listCount ?? 0;

  return (
    <>
      <EntityContextMenu
        entityKind="project"
        openHref={projectUrl(p.id)}
        info={{ id: p.id, type: "project" }}
      >
        <MagicCard
          as={Link}
          href={projectUrl(p.id)}
          enableStars={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 hover:shadow-xs"
          data-boneyard="project-card"
        >
          <div>
            <div className="text-xl text-white">{p.icon}</div>
            <h3 className="mt-4 font-medium text-white">{p.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#dec9e9]">
              {p.description}
            </p>
          </div>
          <p className="mt-5 text-xs text-[#dec9e9]">
            {listCount} {listCount === 1 ? "collection" : "collections"}
          </p>
        </MagicCard>
      </EntityContextMenu>
    </>
  );
}
