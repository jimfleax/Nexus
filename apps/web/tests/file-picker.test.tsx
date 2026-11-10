// @vitest-environment jsdom
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { FilePicker } from "@/components/ui/file-picker";

describe("FilePicker - drop handler & accept validation", () => {
  let alertSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  const createDropEvent = (fileName: string, mimeType: string = "") => {
    const file = new File(["dummy content"], fileName, { type: mimeType });
    return {
      file,
      event: {
        dataTransfer: {
          files: [file],
          clearData: vi.fn(),
        },
      },
    };
  };

  it("accepts any file dropped when accept prop is not specified", () => {
    const onFileSelect = vi.fn();
    render(<FilePicker file={null} onFileSelect={onFileSelect} />);

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;
    const { file, event } = createDropEvent("document.pdf", "application/pdf");

    fireEvent.drop(dropZone, event);

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("handles extension-based accept filter (.png) correctly", () => {
    const onFileSelect = vi.fn();
    render(
      <FilePicker file={null} onFileSelect={onFileSelect} accept=".png" />,
    );

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;

    // Non-matching file
    const rejected = createDropEvent("document.pdf", "application/pdf");
    fireEvent.drop(dropZone, rejected.event);
    expect(onFileSelect).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith("Invalid file type. Accepted: .png");

    // Matching file
    const accepted = createDropEvent("image.png", "image/png");
    fireEvent.drop(dropZone, accepted.event);
    expect(onFileSelect).toHaveBeenCalledWith(accepted.file);
  });

  it("handles MIME wildcard accept filter (image/*) correctly", () => {
    const onFileSelect = vi.fn();
    render(
      <FilePicker file={null} onFileSelect={onFileSelect} accept="image/*" />,
    );

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;

    // Matching jpeg
    const accepted = createDropEvent("photo.jpg", "image/jpeg");
    fireEvent.drop(dropZone, accepted.event);
    expect(onFileSelect).toHaveBeenCalledWith(accepted.file);

    // Non-matching text/plain
    const rejected = createDropEvent("notes.txt", "text/plain");
    fireEvent.drop(dropZone, rejected.event);
    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid file type. Accepted: image/*",
    );
  });

  it("handles complex MIME types with regex characters (image/svg+xml) safely without regex errors", () => {
    const onFileSelect = vi.fn();
    render(
      <FilePicker
        file={null}
        onFileSelect={onFileSelect}
        accept="image/svg+xml"
      />,
    );

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;

    // Matching svg
    const accepted = createDropEvent("vector.svg", "image/svg+xml");
    fireEvent.drop(dropZone, accepted.event);
    expect(onFileSelect).toHaveBeenCalledWith(accepted.file);

    // Non-matching image/png
    const rejected = createDropEvent("raster.png", "image/png");
    fireEvent.drop(dropZone, rejected.event);
    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      "Invalid file type. Accepted: image/svg+xml",
    );
  });

  it("properly validates comma-separated accept lists with mixed types and extensions", () => {
    const accept = ".pdf, image/*, .docx, image/svg+xml";
    const onFileSelect = vi.fn();
    render(
      <FilePicker file={null} onFileSelect={onFileSelect} accept={accept} />,
    );

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;

    // 1. .pdf match
    const pdf = createDropEvent("manual.pdf", "application/pdf");
    fireEvent.drop(dropZone, pdf.event);
    expect(onFileSelect).toHaveBeenLastCalledWith(pdf.file);

    // 2. image/* match
    const png = createDropEvent("photo.png", "image/png");
    fireEvent.drop(dropZone, png.event);
    expect(onFileSelect).toHaveBeenLastCalledWith(png.file);

    // 3. .docx match
    const docx = createDropEvent(
      "spec.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    fireEvent.drop(dropZone, docx.event);
    expect(onFileSelect).toHaveBeenLastCalledWith(docx.file);

    // 4. image/svg+xml match
    const svg = createDropEvent("logo.svg", "image/svg+xml");
    fireEvent.drop(dropZone, svg.event);
    expect(onFileSelect).toHaveBeenLastCalledWith(svg.file);

    // 5. Rejected archive
    const zip = createDropEvent("archive.zip", "application/zip");
    fireEvent.drop(dropZone, zip.event);
    expect(onFileSelect).toHaveBeenCalledTimes(4); // Did not increase
    expect(alertSpy).toHaveBeenCalledWith(
      `Invalid file type. Accepted: ${accept}`,
    );
  });

  it("handles case-insensitive extension matching", () => {
    const onFileSelect = vi.fn();
    render(
      <FilePicker file={null} onFileSelect={onFileSelect} accept=".png" />,
    );

    const dropZone = screen
      .getByText("Drag and drop your file here")
      .closest("div[class*='border-2']")!;

    const uppercaseFile = createDropEvent("PHOTO.PNG", "image/png");
    fireEvent.drop(dropZone, uppercaseFile.event);
    expect(onFileSelect).toHaveBeenCalledWith(uppercaseFile.file);
  });
});
