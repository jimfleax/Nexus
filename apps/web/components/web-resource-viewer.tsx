/**
 * @file web-resource-viewer.tsx
 * @description Viewer for URL resources: an external link card with an embedded sandboxed iframe preview.
 * @architecture Client component; iframe uses sandbox attributes and falls back to an empty-state when no URL is present.
 */
"use client";
import type { Resource } from "@nexus/shared";
import { ViewerHeader } from "@/components/ui/viewer-header";
import { ViewerEmptyState } from "@/components/ui/viewer-empty-state";

import { ArrowSquareOut, Globe, Info } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * @desc    Render a web link card with an iframe preview and open-site action
 * @param   {{title: string; url?: string}} props - Resource title and target URL
 * @returns {JSX.Element} The web resource viewer
 */
export function WebResourceViewer({ resource }: { resource: Resource }) {
  if (!resource.url) {
    return (
      <ViewerEmptyState
        icon={Globe}
        title={resource.title}
        message="Add a website URL to preview or link this resource."
      />
    );
  }

  return (
    <section
      aria-label={`${resource.title} web resource`}
      className="space-y-3"
    >
      <div className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
        <ViewerHeader
          resource={resource}
          actions={
            <a
              className={buttonVariants({ variant: "default", size: "sm" })}
              href={resource.url!}
              target="_blank"
              rel="noreferrer"
            >
              <span>Open in new tab</span>
              <ArrowSquareOut className="size-3.5" />
            </a>
          }
        />

        <iframe
          title={resource.title}
          src={resource.url}
          className="h-[75vh] min-h-[500px] w-full bg-white border-none"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        />
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-[#dec9e9] bg-[#f8f4fb] px-3.5 py-2.5 text-xs text-[#6247aa]">
        <Info className="size-4 shrink-0 text-[#7251b5] mt-0.5" />
        <p>
          Some external websites restrict embedded previews via browser security
          policies (<code>X-Frame-Options</code>). If the preview is blank, use
          the <strong>Open site</strong> button above.
        </p>
      </div>
    </section>
  );
}
