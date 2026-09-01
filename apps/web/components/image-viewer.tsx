/**
 * @file image-viewer.tsx
 * @description Viewer for image resources: large preview with alt caption and a full-resolution link.
 * @architecture Client component; falls back to an empty-state message when no image URL is present.
 */
"use client";

import { ArrowSquareOut, ImageBroken } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * @desc    Render an image preview with alt caption and full-resolution action
 * @param   {{title: string; url?: string; alt?: string}} props - Title, image URL, and optional alt text
 * @returns {JSX.Element} The image viewer
 */
export function ImageViewer({
  title,
  url,
  alt,
}: {
  title: string;
  url?: string;
  alt?: string;
}) {
  if (!url) {
    return (
      <section className="rounded-xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
        <ImageBroken className="mx-auto size-10 text-[#6247aa]" />
        <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
        <p className="mt-2 text-sm text-[#6247aa]">
          Add an image URL to display this asset here.
        </p>
      </section>
    );
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-[#dec9e9] bg-[#f8f4fb] px-4 py-2.5">
        <span className="truncate text-xs font-medium text-[#6247aa]">
          {title}
        </span>
        <a
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <span>View full resolution</span>
          <ArrowSquareOut className="size-3.5" />
        </a>
      </div>

      <div className="grid min-h-[360px] place-items-center bg-[#dec9e9] p-6">
        <img
          src={url}
          alt={alt || title}
          className="max-h-[75vh] w-auto max-w-full rounded-md object-contain shadow-xs"
        />
      </div>

      {alt && (
        <figcaption className="border-t border-[#dec9e9] bg-white px-5 py-3 text-sm text-[#6247aa]">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}
