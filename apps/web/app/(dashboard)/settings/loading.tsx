"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "boneyard-js/react";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        className="border-none pb-0"
        kicker={<p className="text-sm text-[#815ac0]">Preferences</p>}
        title={<span className="mt-1 block">Reading settings</span>}
        subtitle={
          <span className="mt-3 block max-w-xl text-[#815ac0]">
            Make long-form resources feel right for the way you read.
          </span>
        }
        actions={
          <Skeleton name="button" loading>
            {null}
          </Skeleton>
        }
      />
      <div className="mt-9 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Skeleton name="resource-viewer" loading>
            {null}
          </Skeleton>
        </div>
        <div className="lg:sticky lg:top-20 lg:h-fit space-y-6">
          <Skeleton name="resource-viewer" loading>
            {null}
          </Skeleton>
        </div>
      </div>
    </div>
  );
}
