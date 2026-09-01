/**
 * @file dashboard.tsx
 * @description Home dashboard: gradient hero greeting with project grid, quick-add notch, and a recent-resources section.
 * @architecture Client component composing hero and recent sections from useProjects, recent query, and shared cards.
 */
"use client";

import React from "react";
import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/use-projects";
import { ProjectCard } from "@/components/project-card";

import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ListSkeleton,
  ProjectGridSkeleton,
} from "@/components/ui/data-skeletons";
import { QuickAddNotch } from "@/components/layout/quick-add-notch";
import { MagicContainer } from "@/components/ui/magic-card";
import { BookOpen } from "@phosphor-icons/react";

/**
 * @desc    Time-of-day greeting for the hero
 * @returns {string} "Good morning", "Good afternoon", or "Good evening"
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * @desc    Render the dashboard hero and recent-resources sections
 * @returns {JSX.Element} The dashboard
 */
export function Dashboard() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: recentResources = [], isLoading: recentLoading } = useQuery({
    queryKey: ["recentResources"],
    queryFn: () => apiClient.user.recent(),
  });

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div>
      <BackgroundGradientAnimation
        containerClassName="rounded-3xl shadow-sm mb-12 w-full h-auto min-h-[400px]"
        className="p-8 relative z-20 w-full h-full"
      >
        <div className="flex items-start justify-between relative z-30">
          <p className="text-sm font-medium tracking-wide text-white/80 uppercase">
            {formattedDate}
          </p>
          <QuickAddNotch />
        </div>
        <h1 className="mt-1 font-serif text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 drop-shadow-sm [text-shadow:_0_4px_24px_rgb(255_255_255_/_20%)] relative z-20">
          {getGreeting()}
        </h1>
        <p className="mt-2 text-white/80 relative z-20">
          Continue where you left off in your knowledge workspace.
        </p>

        <section className="mt-10 relative z-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-white">Projects</h2>
            <Link
              href="/projects"
              className="text-sm font-medium text-[#dec9e9] hover:text-white hover:underline"
            >
              View all ({projects.length})
            </Link>
          </div>
          {projectsLoading ? (
            <ProjectGridSkeleton
              count={3}
              className="border-white/20 bg-white/10"
              gridClassName="gap-3 md:grid-cols-3"
            />
          ) : (
            <MagicContainer
              className="grid gap-3 sm:grid-cols-2 md:grid-cols-3"
              glowColor="255, 255, 255"
            >
              {projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </MagicContainer>
          )}
        </section>
      </BackgroundGradientAnimation>

      <section className="mt-12 mb-12">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-xl">Recent Resources</h2>
          <Link
            href="/recent"
            className="text-sm font-medium text-[#6247aa] hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="border-y border-[#dec9e9]">
          {recentLoading ? (
            <ListSkeleton rows={3} />
          ) : recentResources.length ? (
            recentResources.map((r, index) => (
              <ResourceCard key={r.id} resource={r} index={index} />
            ))
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No resources yet"
              description="Create your first resource to get started."
            />
          )}
        </div>
      </section>
    </div>
  );
}
