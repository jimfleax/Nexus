/**
 * @file project-card.tsx
 * @description Compact animated project card used on the dashboard hero.
 * @architecture Client component wrapping the project in a MagicCard link with star/tilt/magnetism effects.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagicCard } from "@/components/ui/magic-card";
import type { Project } from "@nexus/shared";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { InfoDialog } from "@/components/ui/info-dialog";

/**
 * @desc    Render a project as an animated linkable card
 * @param   {{p: Project}} props - The project to display
 * @returns {JSX.Element} The project card
 */
export function ProjectCard({ p }: { p: Project & { listCount?: number } }) {
  const listCount = p.listCount ?? 0;
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <MagicCard
              as={Link}
              href={`/projects/${p.id}`}
              enableStars={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 hover:shadow-xs"
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
          }
        />
        <ContextMenuContent>
          <ContextMenuItem onClick={() => router.push(`/projects/${p.id}`)}>
            Open
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setInfoOpen(true)}>
            Info
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <InfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        type="project"
        id={p.id}
      />
    </>
  );
}
