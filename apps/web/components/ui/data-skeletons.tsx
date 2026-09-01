/**
 * @file data-skeletons.tsx
 * @description Composed skeleton placeholders for resource lists and project grids, built from the base Skeleton atom.
 */
"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @desc    Skeleton row matching the ResourceCard layout
 */
export function ResourceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-3 border-b border-[#dec9e9] py-4 last:border-b-0",
        className,
      )}
    >
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5 max-w-[220px]" />
        <Skeleton className="h-3 w-full max-w-[340px]" />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * @desc    Render a column of resource-card skeleton rows
 * @param   {{rows?: number; containerClassName?: string; className?: string}} props - Row count and layout classes
 * @returns {JSX.Element} The skeleton list
 */
export function ListSkeleton({
  rows = 4,
  containerClassName,
  className,
}: {
  rows?: number;
  containerClassName?: string;
  className?: string;
}) {
  return (
    <div className={containerClassName}>
      {Array.from({ length: rows }, (_, i) => (
        <ResourceCardSkeleton key={i} className={className} />
      ))}
    </div>
  );
}

/**
 * @desc    Skeleton card matching the ProjectCard layout
 */
export function ProjectCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-[#dec9e9] bg-white p-5",
        className,
      )}
    >
      <div className="space-y-3">
        <Skeleton className="size-6" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="mt-4 h-3 w-24" />
    </div>
  );
}

/**
 * @desc    Render a grid of project-card skeletons
 * @param   {{count?: number; className?: string; gridClassName?: string}} props - Card count and layout classes
 * @returns {JSX.Element} The skeleton grid
 */
export function ProjectGridSkeleton({
  count = 4,
  className,
  gridClassName,
}: {
  count?: number;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", gridClassName)}>
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} className={className} />
      ))}
    </div>
  );
}
