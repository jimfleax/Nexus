"use client";

/**
 * @file resource-list.tsx
 * @description Shared resource list with loading skeleton, empty state, and card rendering. Eliminates the P3 ternary duplication across recent/favorites/list-page/dashboard.
 */
import type { Icon } from "@phosphor-icons/react";
import type { Resource } from "@nexus/shared";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ResourceCard } from "@/components/resource-card";
import { Skeleton } from "boneyard-js/react";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatePresence, motion } from "motion/react";

export function ResourceList({
  items,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  action,
  className,
  skeletonCount = 5,
}: {
  items: Resource[];
  isLoading: boolean;
  emptyIcon?: Icon;
  emptyTitle: string;
  emptyDescription?: string;
  action?: ReactNode;
  className?: string;
  skeletonCount?: number;
}) {
  return (
    <div className={cn("mt-6 max-w-4xl", className)}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col border-y border-[#dec9e9]"
          >
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Skeleton key={i} name="resource-card" loading>
                {null}
              </Skeleton>
            ))}
          </motion.div>
        ) : items.length > 0 ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-y border-[#dec9e9]"
          >
            {items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={action}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
