/**
 * @file pdf-viewer.tsx
 * @description Viewer for PDF resources: embedded react-pdf preview with download, zoom, and pagination.
 * @architecture Client component; falls back to an empty-state message when no PDF URL is present.
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Download,
  ArrowSquareOut,
  FileText,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  CaretLeft,
  CaretRight,
  ArrowCounterClockwise,
  CornersOut,
  CornersIn,
  Rows,
  Square,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure the PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * @desc    Render a PDF preview with pagination and zoom
 * @param   {{title: string; url?: string}} props - Resource title and PDF URL
 * @returns {JSX.Element} The PDF viewer
 */
export function PdfViewer({ title, url }: { title: string; url?: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [blobUrl, setBlobUrl] = useState<string>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "scroll">("single");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const {
    data: blob,
    isPending: isLoadingPdf,
    error: queryError,
  } = useQuery({
    queryKey: ["pdf", url],
    queryFn: async () => {
      if (!url) return null;
      let fetchUrl: string = url;
      if (typeof window !== "undefined" && !url.startsWith("http")) {
        fetchUrl = `${window.location.origin}${url}`;
      }
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
      return await res.blob();
    },
    enabled: !!url,
    staleTime: Infinity,
  });

  const pdfError = queryError
    ? queryError instanceof Error
      ? queryError.message
      : String(queryError)
    : undefined;

  useEffect(() => {
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [blob]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
    },
    [],
  );

  const changePage = useCallback(
    (offset: number) =>
      setPageNumber((prev) =>
        Math.min(Math.max(1, prev + offset), numPages || 1),
      ),
    [numPages],
  );

  const previousPage = useCallback(() => changePage(-1), [changePage]);
  const nextPage = useCallback(() => changePage(1), [changePage]);

  const zoomIn = useCallback(
    () => setScale((prev) => Math.min(prev + 0.25, 3.0)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((prev) => Math.max(prev - 0.25, 0.5)),
    [],
  );
  const zoomReset = useCallback(() => setScale(1.0), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsTransitioning(true);
    setIsExpanded((prev) => !prev);

    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    transitionTimeout.current = setTimeout(() => {
      setIsTransitioning(false);
    }, 400);
  }, []);

  if (!url) return <UnavailablePdf title={title} />;

  return (
    <motion.section
      layout
      aria-label={`${title} PDF`}
      className={`flex flex-col overflow-hidden bg-white shadow-xs ${
        isExpanded
          ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none"
          : "rounded-2xl border border-[#dec9e9]"
      }`}
    >
      <div className="flex flex-col gap-2 border-b border-[#dec9e9] bg-[#f8f4fb] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#6247aa]">
          <FileText className="size-4 shrink-0 text-[#6247aa]" />
          <span className="truncate">{title}</span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 text-xs text-[#6247aa] font-medium bg-[#dec9e9]/30 rounded-md p-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={zoomOut}
                    className="p-1 hover:bg-[#dec9e9]/50 rounded text-[#6247aa]"
                    aria-label="Zoom Out"
                    disabled={scale <= 0.5}
                  />
                }
              >
                <MagnifyingGlassMinus className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={zoomReset}
                    className="p-1 hover:bg-[#dec9e9]/50 rounded text-[#6247aa]"
                    aria-label="Reset Zoom"
                  />
                }
              >
                <ArrowCounterClockwise className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Reset zoom</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={zoomIn}
                    className="p-1 hover:bg-[#dec9e9]/50 rounded text-[#6247aa]"
                    aria-label="Zoom In"
                    disabled={scale >= 3.0}
                  />
                }
              >
                <MagnifyingGlassPlus className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#6247aa] font-medium bg-[#dec9e9]/30 rounded-md p-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setViewMode("single")}
                    className={`p-1 rounded text-[#6247aa] ${viewMode === "single" ? "bg-[#dec9e9]/80" : "hover:bg-[#dec9e9]/50"}`}
                    aria-label="Single Page View"
                  />
                }
              >
                <Square className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Single page view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setViewMode("scroll")}
                    className={`p-1 rounded text-[#6247aa] ${viewMode === "scroll" ? "bg-[#dec9e9]/80" : "hover:bg-[#dec9e9]/50"}`}
                    aria-label="Continuous Scroll View"
                  />
                }
              >
                <Rows className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Continuous scroll view</TooltipContent>
            </Tooltip>
          </div>

          {numPages && viewMode === "single" && (
            <div className="flex items-center gap-2 text-xs text-[#6247aa] font-medium">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={previousPage}
                      disabled={pageNumber <= 1}
                      className="p-1 hover:bg-[#dec9e9]/50 rounded disabled:opacity-50"
                      aria-label="Previous Page"
                    />
                  }
                >
                  <CaretLeft className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Previous page</TooltipContent>
              </Tooltip>
              <span>
                {pageNumber} of {numPages}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={nextPage}
                      disabled={pageNumber >= numPages}
                      className="p-1 hover:bg-[#dec9e9]/50 rounded disabled:opacity-50"
                      aria-label="Next Page"
                    />
                  }
                >
                  <CaretRight className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Next page</TooltipContent>
              </Tooltip>
            </div>
          )}

          <div className="flex items-center gap-1">
            <a
              className={buttonVariants({ variant: "default", size: "icon" })}
              href={blobUrl || url}
              download
              target="_blank"
              rel="noreferrer"
              title="Download"
            >
              <Download className="size-4" />
            </a>
            <a
              className={buttonVariants({ variant: "default", size: "icon" })}
              href={blobUrl || url}
              target="_blank"
              rel="noreferrer"
              title="Open in New Tab"
            >
              <ArrowSquareOut className="size-4" />
            </a>
            <button
              type="button"
              className={buttonVariants({ variant: "secondary", size: "icon" })}
              onClick={toggleExpanded}
              title={isExpanded ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isExpanded ? (
                <CornersIn className="size-4" />
              ) : (
                <CornersOut className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex w-full flex-col overflow-auto bg-[#dec9e9] p-4 transition-opacity ${
          isTransitioning
            ? "opacity-0 duration-150"
            : "opacity-100 duration-500 delay-100"
        } ${isExpanded ? "flex-1" : "h-[78vh] min-h-[500px]"}`}
      >
        {isLoadingPdf ? (
          <div className="flex h-full items-center justify-center text-[#6247aa] m-auto">
            <p>Fetching PDF...</p>
          </div>
        ) : pdfError ? (
          <div className="flex h-full items-center justify-center text-red-500 m-auto">
            <p>Error: {pdfError}</p>
          </div>
        ) : blobUrl ? (
          <Document
            file={blobUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className={`flex flex-col items-center ${viewMode === "single" ? "m-auto" : ""}`}
            loading={
              <div className="text-sm text-[#6247aa] m-auto">
                Rendering PDF...
              </div>
            }
          >
            {viewMode === "scroll" && numPages ? (
              <div className="flex flex-col gap-4 pb-8">
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={containerWidth ? containerWidth - 32 : undefined}
                    scale={scale}
                    className="shadow-md shrink-0"
                  />
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center">
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth ? containerWidth - 32 : undefined}
                  scale={scale}
                  className="shadow-md shrink-0"
                />
              </div>
            )}
          </Document>
        ) : null}
      </div>
    </motion.section>
  );
}

/**
 * @desc    Empty-state shown when no PDF URL is available
 */
function UnavailablePdf({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-[#d2b7e5] bg-[#f8f4fb] px-6 py-16 text-center">
      <FileText className="mx-auto size-10 text-[#6247aa]" />
      <h2 className="mt-3 font-serif text-xl text-[#6247aa]">{title}</h2>
      <p className="mt-2 text-sm text-[#6247aa]">
        No PDF URL provided. Add a web link to preview or read this document
        directly here.
      </p>
    </section>
  );
}
