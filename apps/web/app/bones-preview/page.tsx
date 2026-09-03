"use client";

/**
 * @file bones-preview/page.tsx
 * @description Boneyard capture page — renders all skeleton fixtures so the CLI can snapshot them.
 * NOT auth-gated. Only used during `npm run build:bones`.
 */

import { Skeleton } from "boneyard-js/react";

export default function BonesPreviewPage() {
  return (
    <div className="p-8 space-y-12 bg-white max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-400">
        Boneyard Capture Page (dev only)
      </h1>

      <section>
        <h2 className="text-sm text-gray-400 mb-2">resource-card</h2>
        <Skeleton name="resource-card" loading={false}>
          <div
            data-boneyard="resource-card"
            className="flex gap-3 border-b border-gray-100 py-4"
          >
            <div className="size-10 shrink-0 rounded-lg bg-gray-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 max-w-[220px] rounded bg-gray-100" />
              <div className="h-3 w-full max-w-[340px] rounded bg-gray-100" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-3 w-14 rounded bg-gray-100" />
                <div className="h-3 w-16 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </Skeleton>
      </section>

      <section>
        <h2 className="text-sm text-gray-400 mb-2">project-card</h2>
        <Skeleton name="project-card" loading={false}>
          <div
            data-boneyard="project-card"
            className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 h-[180px]"
          >
            <div className="space-y-3">
              <div className="size-6 rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
              <div className="h-3 w-full rounded bg-gray-100" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
            <div className="mt-4 h-3 w-24 rounded bg-gray-100" />
          </div>
        </Skeleton>
      </section>

      <section>
        <h2 className="text-sm text-gray-400 mb-2">project-list-card</h2>
        <Skeleton name="project-list-card" loading={false}>
          <div
            data-boneyard="project-list-card"
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4"
          >
            <div className="size-8 rounded bg-gray-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
            <div className="h-3 w-16 rounded bg-gray-100" />
          </div>
        </Skeleton>
      </section>

      <section>
        <h2 className="text-sm text-gray-400 mb-2">search-result</h2>
        <Skeleton name="search-result" loading={false}>
          <div
            data-boneyard="search-result"
            className="flex gap-3 border-b border-gray-100 py-3"
          >
            <div className="size-9 shrink-0 rounded bg-gray-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/5 rounded bg-gray-100" />
              <div className="h-3 w-full max-w-[300px] rounded bg-gray-100" />
            </div>
          </div>
        </Skeleton>
      </section>

      <section>
        <h2 className="text-sm text-gray-400 mb-2">profile-metrics</h2>
        <Skeleton name="profile-metrics" loading={false}>
          <div
            data-boneyard="profile-metrics"
            className="grid grid-cols-3 gap-4"
          >
            <div className="space-y-1 text-center">
              <div className="h-6 w-12 mx-auto rounded bg-gray-100" />
              <div className="h-3 w-16 mx-auto rounded bg-gray-100" />
            </div>
            <div className="space-y-1 text-center">
              <div className="h-6 w-12 mx-auto rounded bg-gray-100" />
              <div className="h-3 w-16 mx-auto rounded bg-gray-100" />
            </div>
            <div className="space-y-1 text-center">
              <div className="h-6 w-12 mx-auto rounded bg-gray-100" />
              <div className="h-3 w-16 mx-auto rounded bg-gray-100" />
            </div>
          </div>
        </Skeleton>
      </section>
    </div>
  );
}
