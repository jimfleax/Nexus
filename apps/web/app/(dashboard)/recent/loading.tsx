"use client";

import { PageHeader } from "@/components/ui/page-header";
import { ResourceList } from "@/components/ui/resource-list";
import { Skeleton } from "boneyard-js/react";

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
