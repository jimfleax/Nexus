/**
 * @file loading.tsx
 * @description Loading state for a specific resource viewer page.
 * @architecture Displays skeleton loaders for breadcrumbs and resource viewer content.
 */
"use client";

import { Skeleton } from "boneyard-js/react";

/**
 * @desc    Renders a loading skeleton for the Resource viewer page
 * @returns {JSX.Element} The loading UI component
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton name="breadcrumb" loading>
        {null}
      </Skeleton>
      <Skeleton name="resource-viewer" loading>
        {null}
      </Skeleton>
    </div>
  );
}
