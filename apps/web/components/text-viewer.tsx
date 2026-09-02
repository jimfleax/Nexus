/**
 * @file text-viewer.tsx
 * @description Viewer for plain-text resources: shows word/char counts, a copy-to-clipboard action, and reader-styled monospace content.
 * @architecture Client component honoring reader CSS variables for font size, line height, and width.
 */
"use client";
import type { Resource } from "@nexus/shared";
import { ViewerHeader } from "@/components/ui/viewer-header";
import { ViewerEmptyState } from "@/components/ui/viewer-empty-state";

import { FileText } from "@phosphor-icons/react";

/**
 * @desc    Render plain-text content with copy action and word/character counts
 * @param   {{title: string; content?: string}} props - Title and text body
 * @returns {JSX.Element} The text viewer
 */
export function TextViewer({ resource }: { resource: Resource }) {
  if (!resource.content) {
    return (
      <ViewerEmptyState
        icon={FileText}
        title={resource.title}
        message="This text resource has no content yet."
      />
    );
  }

  const wordCount = resource.content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = resource.content.length;

  return (
    <article className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
      <ViewerHeader
        resource={resource}
        actions={
          <div className="flex items-center gap-3 text-xs text-[#6247aa] mr-4">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{charCount} characters</span>
          </div>
        }
      />
      <div className="p-6 md:p-8">
        <pre className="whitespace-pre-wrap break-words font-readable text-[var(--reader-font-size,18px)] leading-[var(--reader-line-height,1.6)] max-w-[var(--reader-max-width,70ch)] text-black">
          {resource.content}
        </pre>
      </div>
    </article>
  );
}
