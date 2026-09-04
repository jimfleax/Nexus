"use client";

/**
 * @file dashboard.tsx
 * @description Home dashboard: gradient hero greeting with project grid, quick-add notch, and a recent-resources section.
 * @architecture Client component composing hero and recent sections from useProjects, recent query, and shared cards.
 */
import React from "react";
import Link from "next/link";
import { ResourceCard } from "@/components/resource-card";
import type { Project, Resource } from "@nexus/shared";
import { useProjects } from "@/hooks/use-projects";
import { useRecentResources } from "@/hooks/use-recent-resources";
import { ProjectCard } from "@/components/project-card";
import { formatLongDate } from "@/lib/utils";

import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "boneyard-js/react";
import { QuickAddNotch } from "@/components/layout/quick-add-notch";
import { MagicContainer } from "@/components/ui/magic-card";
import { BookOpen } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

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
  const { data: recentResources = [], isLoading: recentLoading } =
    useRecentResources();

  const formattedDate = formatLongDate(new Date());

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div>
      <BackgroundGradientAnimation
        containerClassName="rounded-3xl shadow-sm mb-12 w-full h-auto min-h-[400px]"
        className="p-8 relative z-20 w-full h-full"
      >
        <div className="flex items-start justify-between relative z-30">
          <p
            suppressHydrationWarning
            className="text-sm font-medium tracking-wide text-white/80 uppercase"
          >
            {formattedDate}
          </p>
          <QuickAddNotch />
        </div>
        <h1
          suppressHydrationWarning
          className="mt-1 font-serif text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 drop-shadow-sm [text-shadow:_0_4px_24px_rgb(255_255_255_/_20%)] relative z-20"
        >
          {getGreeting()}
        </h1>
        <p className="mt-2 text-white/80 relative z-20">
          Continue where you left off in your knowledge workspace.
        </p>

        {(!isMounted || projectsLoading || projects.length > 0) && (
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
            <MagicContainer
              className="gap-3 md:grid-cols-3 grid"
              glowColor="255, 255, 255"
            >
              {(projectsLoading
                ? (Array.from({ length: 3 }) as unknown[])
                : projects
              ).map((item, i) => {
                const isDummy = projectsLoading;
                return (
                  <Skeleton
                    key={i}
                    name="project-card"
                    loading={projectsLoading}
                  >
                    {isDummy ? (
                      <div style={{ minHeight: 180 }} />
                    ) : (
                      <ProjectCard p={item as Project} />
                    )}
                  </Skeleton>
                );
              })}
            </MagicContainer>
          </section>
        )}
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
        <div
          className={cn(
            "border-y border-[#dec9e9]",
            recentResources.length === 0 && "border-0",
          )}
        >
          {recentLoading || recentResources.length > 0 ? (
            <div className="flex flex-col gap-2">
              {(recentLoading
                ? (Array.from({ length: 3 }) as unknown[])
                : recentResources
              ).map((item, i) => {
                const isDummy = recentLoading;
                return (
                  <Skeleton
                    key={i}
                    name="resource-card"
                    loading={recentLoading}
                  >
                    {isDummy ? (
                      <div style={{ minHeight: 93 }} />
                    ) : (
                      <ResourceCard resource={item as Resource} />
                    )}
                  </Skeleton>
                );
              })}
            </div>
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
