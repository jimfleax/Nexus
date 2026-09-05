/**
 * @file loading.tsx
 * @description Loading state for the projects page.
 * @architecture Displays skeleton loaders for the project grid.
 */
"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Renders a loading skeleton for the Projects page
 * @returns {JSX.Element} The loading UI component
 */
export default function Loading() {
  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Your knowledge contexts, collected in one place."
        actions={
          <Skeleton name="button" loading>
            {null}
          </Skeleton>
        }
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} name="project-card" loading={true}>
            {null}
          </Skeleton>
        ))}
      </div>
    </>
  );
}
