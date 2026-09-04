"use client";

/**
 * @file resource-list.tsx

 * @description Shared resource list with loading skeleton, empty state, and card rendering. Eliminates the P3 ternary duplication across recent/favorites/list-page/dashboard.
 */
import React from "react";
import { motion } from "framer-motion";
import type { Icon } from "@phosphor-icons/react";
import type { Resource } from "@nexus/shared";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ResourceCard } from "@/components/resource-card";
import { Skeleton } from "boneyard-js/react";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className={cn("mt-6 max-w-4xl", className)}>
      {!isMounted || isLoading || items.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col border-y border-[#dec9e9]"
        >
          {(isLoading
            ? (Array.from({ length: skeletonCount }) as Resource[])
            : items
          ).map((item, i) => {
            const isDummy = isLoading;
            return (
              <Skeleton key={i} name="resource-card" loading={isLoading}>
                {isDummy ? (
                  <div style={{ minHeight: 93 }} />
                ) : (
                  <ResourceCard resource={item as Resource} />
                )}
              </Skeleton>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={action}
        />
      )}
    </div>
  );
}
