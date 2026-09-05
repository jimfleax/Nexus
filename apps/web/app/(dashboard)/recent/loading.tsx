/**
 * @file loading.tsx
 * @description Loading state for the recent resources page.
 * @architecture Displays skeleton loaders while recent resources are fetched.
 */
"use client";

import { PageHeader } from "@/components/ui/page-header";
import { ResourceList } from "@/components/ui/resource-list";
import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Renders a loading skeleton for the Recent page
 * @returns {JSX.Element} The loading UI component
 */
export default function Loading() {
  return (
    <>
      <PageHeader
        title="Recent"
        subtitle="Continue reading where you left off."
        actions={
          <Skeleton name="button" loading>
            {null}
          </Skeleton>
        }
      />
      <ResourceList items={[]} isLoading={true} emptyTitle="Loading..." />
    </>
  );
}
