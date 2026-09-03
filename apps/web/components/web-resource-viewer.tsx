/**
 * @file web-resource-viewer.tsx
 * @description Viewer for URL resources: an external link card with an embedded sandboxed iframe preview.
 * @architecture Client component; iframe uses sandbox attributes and falls back to an empty-state when no URL is present.
 */
"use client";
import type { Resource } from "@nexus/shared";
import { ViewerHeader } from "@/components/ui/viewer-header";
import { ViewerEmptyState } from "@/components/ui/viewer-empty-state";
import { useResourceText } from "@/hooks/use-resources";
import {
  ArrowSquareOut,
  Globe,
  Info,
  CircleNotch,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * @desc    Render a web link card with an iframe preview and open-site action
 * @param   {{resource: Resource}} props - Resource
 * @returns {JSX.Element} The web resource viewer
 */
export function WebResourceViewer({ resource }: { resource: Resource }) {
  const { data: urlContent, isLoading, isError } = useResourceText(resource.id);

  if (isLoading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-4 bg-[#f8f4fb] border border-[#dec9e9] rounded-xl">
        <CircleNotch className="h-8 w-8 animate-spin text-[#6247aa]" />
        <span className="text-sm font-medium text-[#6247aa]">
          Loading URL...
        </span>
      </div>
    );
  }

  const url = urlContent?.trim();

  if (isError || !url) {
    return (
      <ViewerEmptyState
        icon={Globe}
        title={resource.title}
        message="This web resource has no URL or could not be loaded."
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
              href={url}
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
          src={url}
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
