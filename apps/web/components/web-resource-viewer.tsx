/**
 * @file web-resource-viewer.tsx
 * @description Viewer for URL resources: an external link card with an embedded sandboxed iframe preview.
 * @architecture Client component; iframe uses sandbox attributes and falls back to an empty-state when no URL is present.
 */
"use client";

import { ArrowSquareOut, Globe, Info } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";

/**
 * @desc    Render a web link card with an iframe preview and open-site action
 * @param   {{title: string; url?: string}} props - Resource title and target URL
 * @returns {JSX.Element} The web resource viewer
 */
export function WebResourceViewer({
  title,
  url,
}: {
  title: string;
  url?: string;
}) {
  if (!url) {
    return (
      <section className="rounded-xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
        <Globe className="mx-auto size-10 text-[#6247aa]" />
        <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
        <p className="mt-2 text-sm text-[#6247aa]">
          Add a website URL to preview or link this resource.
        </p>
      </section>
    );
  }

  return (
    <section aria-label={`${title} web resource`} className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dec9e9] bg-[#f8f4fb] px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-[#6247aa]">
            <Globe className="size-4 shrink-0 text-[#6247aa]" />
            <span className="truncate font-mono text-xs text-[#6247aa]">
              {url}
            </span>
          </span>
          <a
            className={buttonVariants({ variant: "default", size: "sm" })}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open site</span>
            <ArrowSquareOut className="size-3.5" />
          </a>
        </div>

        <iframe
          title={title}
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
