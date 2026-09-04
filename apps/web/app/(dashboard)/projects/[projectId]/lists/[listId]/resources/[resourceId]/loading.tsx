"use client";

import { Skeleton } from "boneyard-js/react";

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
