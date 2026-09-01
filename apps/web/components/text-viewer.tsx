/**
 * @file text-viewer.tsx
 * @description Viewer for plain-text resources: shows word/char counts, a copy-to-clipboard action, and reader-styled monospace content.
 * @architecture Client component honoring reader CSS variables for font size, line height, and width.
 */
"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * @desc    Render plain-text content with copy action and word/character counts
 * @param   {{title: string; content?: string}} props - Title and text body
 * @returns {JSX.Element} The text viewer
 */
export function TextViewer({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!content) {
    return (
      <section className="rounded-xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
        <FileText className="mx-auto size-10 text-[#6247aa]" />
        <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
        <p className="mt-2 text-sm text-[#6247aa]">
          This text resource has no content yet.
        </p>
      </section>
    );
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failed */
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-[#dec9e9] bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-[#dec9e9] bg-[#f8f4fb] px-4 py-2.5">
        <div className="flex items-center gap-3 text-xs text-[#6247aa]">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} characters</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 px-2 text-xs text-[#6247aa] hover:text-[#6247aa]"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-[#6247aa]" />
              <span className="text-[#6247aa]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy text</span>
            </>
          )}
        </Button>
      </div>

      <div className="p-6 md:p-8">
        <pre className="whitespace-pre-wrap break-words font-readable text-[var(--reader-font-size,18px)] leading-[var(--reader-line-height,1.6)] max-w-[var(--reader-max-width,70ch)] text-black">
          {content}
        </pre>
      </div>
    </article>
  );
}
