// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { PdfViewer } from "@/components/pdf-viewer";
import { TestWrapper } from "./test-utils";

// Mock ResizeObserver for jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock pdfjs and react-pdf components
vi.mock("react-pdf", () => ({
  pdfjs: {
    version: "11.0.0",
    GlobalWorkerOptions: {
      workerSrc: "",
    },
  },
  Document: ({ children, loading, suspense }: any) => (
    <div data-testid="pdf-document" data-suspense={String(suspense)}>
      {loading}
      {children}
    </div>
  ),
  Page: ({ pageNumber }: any) => (
    <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>
  ),
}));

// Mock react-intersection-observer
vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

// Mock usePdfProgress
vi.mock("@/hooks/use-pdf-progress", () => ({
  usePdfProgress: () => ({
    progress: { currentPage: 1, maxPageReached: 1 },
    syncProgress: vi.fn(),
  }),
}));

describe("PdfViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-pdf-blob-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("renders empty/unavailable state when no url is provided", () => {
    render(<PdfViewer title="Empty Doc" />, { wrapper: TestWrapper });
    expect(screen.getByText("Empty Doc")).toBeDefined();
    expect(screen.getByText(/No PDF URL provided/i)).toBeDefined();
  });

  it("renders the PDF toolbar and document when url is provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () =>
        new Blob(["fake-pdf-content"], { type: "application/pdf" }),
    });

    render(<PdfViewer title="Test PDF" url="https://example.com/test.pdf" />, {
      wrapper: TestWrapper,
    });

    expect(screen.getByText("Test PDF")).toBeDefined();

    await waitFor(() => {
      const doc = screen.getByTestId("pdf-document");
      expect(doc).toBeDefined();
      expect(doc.getAttribute("data-suspense")).toBe("false");
    });
  });
});
