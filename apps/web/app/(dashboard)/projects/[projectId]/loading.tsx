/**
 * @file loading.tsx
 * @description Loading state for a specific project page.
 * @architecture Displays skeleton loaders for breadcrumbs and project lists.
 */
"use client";

import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Renders a loading skeleton for the Project detail page
 * @returns {JSX.Element} The loading UI component
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton name="breadcrumb" loading>
        {null}
      </Skeleton>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} name="project-list-card" loading>
            {null}
          </Skeleton>
        ))}
      </div>
    </div>
  );
}
