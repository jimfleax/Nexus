/**
 * @file image-viewer.tsx
 * @description Viewer for image resources: large preview with alt caption and a full-resolution link.
 * @architecture Client component; falls back to an empty-state message when no image URL is present.
 */
"use client";
import type { Resource } from "@nexus/shared";
import { ViewerHeader } from "@/components/ui/viewer-header";
import { ViewerEmptyState } from "@/components/ui/viewer-empty-state";

import { ArrowSquareOut, ImageBroken } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * @desc    Render an image preview with alt caption and full-resolution action
 * @param   {{title: string; url?: string; alt?: string}} props - Title, image URL, and optional alt text
 * @returns {JSX.Element} The image viewer
 */
export function ImageViewer({ resource }: { resource: Resource }) {
  const imageUrl =
    resource.url ||
    (resource.driveFileId ? `/api/resources/${resource.id}/file` : undefined);

  if (!imageUrl) {
    return (
      <ViewerEmptyState
        icon={ImageBroken}
        title={resource.title}
        message="Add an image URL or upload an image to display it here."
      />
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
      <ViewerHeader
        resource={resource}
        actions={
          <a
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span>View full resolution</span>
            <ArrowSquareOut className="size-3.5" />
          </a>
        }
      />

      <div className="grid min-h-[360px] place-items-center bg-[#dec9e9] p-6">
        <img
          src={imageUrl}
          alt={resource.description || resource.title}
          className="max-h-[75vh] w-auto max-w-full rounded-md object-contain shadow-xs"
        />
      </div>

      {resource.description && (
        <figcaption className="border-t border-[#dec9e9] bg-white px-5 py-3 text-sm text-[#6247aa]">
          {resource.description}
        </figcaption>
      )}
    </figure>
  );
}
