/**
 * @file resource-viewer.tsx
 * @description Dispatcher that renders the correct type-specific viewer for a resource, wrapped in a Suspense fallback.
 * @architecture Client component; lazily loads markdown/pdf/image/web/chat viewers and routes on resource.type.
 */
"use client";

import React, { Suspense } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import type { Resource } from "@nexus/shared";
import { TextViewer } from "@/components/text-viewer";

const MarkdownViewer = React.lazy(() =>
  import("@/components/markdown-viewer").then((mod) => ({
    default: mod.MarkdownViewer,
  })),
);
import dynamic from "next/dynamic";
const PdfViewer = dynamic(
  () => import("@/components/pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false },
);
const ImageViewer = React.lazy(() =>
  import("@/components/image-viewer").then((mod) => ({
    default: mod.ImageViewer,
  })),
);
const WebResourceViewer = React.lazy(() =>
  import("@/components/web-resource-viewer").then((mod) => ({
    default: mod.WebResourceViewer,
  })),
);
const ChatViewer = React.lazy(() =>
  import("@/components/chat-viewer").then((mod) => ({
    default: mod.ChatViewer,
  })),
);

/**
 * @desc    Spinner shown while a lazy viewer loads
 */
function ViewerFallback() {
  return (
    <div className="flex h-64 w-full flex-col items-center justify-center gap-4 bg-[#f8f4fb] border border-[#dec9e9]">
      <CircleNotch className="h-8 w-8 animate-spin text-[#6247aa]" />
      <span className="text-sm font-medium text-[#6247aa]">
        Loading viewer...
      </span>
    </div>
  );
}

/**
 * @desc    Render the type-appropriate viewer for a resource
 * @param   {{resource: Resource}} props - The resource to view
 * @returns {JSX.Element} The viewer wrapped in Suspense
 */
export function ResourceViewer({ resource }: { resource: Resource }) {
  let content;

  switch (resource.type) {
    case "markdown":
      content = resource.content ? (
        <MarkdownViewer content={resource.content} />
      ) : (
        <TextViewer resource={resource} />
      );
      break;
    case "pdf": {
      const pdfUrl =
        resource.url ||
        (resource.driveFileId
          ? `/api/resources/${resource.id}/file`
          : undefined);
      content = <PdfViewer title={resource.title} url={pdfUrl} />;
      break;
    }
    case "image":
      content = <ImageViewer resource={resource} />;
      break;
    case "url":
      content = <WebResourceViewer resource={resource} />;
      break;
    case "chat":
      content = (
        <ChatViewer
          title={resource.title}
          content={(resource as unknown as { content: string }).content}
        />
      );
      break;
    case "text":
    case "note":
    case "ebook":
      content = <TextViewer resource={resource} />;
      break;
    default:
      content = <TextViewer resource={resource} />;
      break;
  }

  return <Suspense fallback={<ViewerFallback />}>{content}</Suspense>;
}
