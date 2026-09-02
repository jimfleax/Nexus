/**
 * @file utils.test.ts
 * @description Unit tests for the shared utility functions in lib/utils.ts.
 */

import { describe, it, expect } from "vitest";
import { cn, formatBytes, formatDate, formatFilenameToTitle } from "./utils";

describe("cn", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", false && "hidden", "extra");
    expect(result).toBe("base extra");
  });

  it("should resolve Tailwind conflicts", () => {
    const result = cn("px-4 py-2", "px-8");
    expect(result).toBe("py-2 px-8");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("formatBytes", () => {
  it("should format 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("should format bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("should format 1 KB as 1.0 KB", () => {
    // value=1.0, which is < 100, so toFixed(1) is used
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("should format 1.5 KB", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("should format 100 KB without decimal", () => {
    // value=100, which is >= 100, so toFixed(0) is used
    expect(formatBytes(102400)).toBe("100 KB");
  });

  it("should format 1 MB as 1.0 MB", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("should format 1 GB as 1.0 GB", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("should format 1 TB as 1.0 TB", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB");
  });

  it("should return em dash for null", () => {
    expect(formatBytes(null)).toBe("—");
  });

  it("should return em dash for undefined", () => {
    expect(formatBytes(undefined)).toBe("—");
  });

  it("should return em dash for NaN", () => {
    expect(formatBytes(NaN)).toBe("—");
  });
});

describe("formatDate", () => {
  it("should format a Date object", () => {
    const date = new Date("2025-03-15");
    const result = formatDate(date);
    expect(result).toBe("Mar 15, 2025");
  });

  it("should format a date string", () => {
    const result = formatDate("2025-12-25");
    expect(result).toBe("Dec 25, 2025");
  });

  it("should return em dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("should return em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("should return em dash for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatFilenameToTitle", () => {
  it("should remove file extension", () => {
    expect(formatFilenameToTitle("document.pdf")).toBe("Document");
  });

  it("should replace hyphens and underscores with spaces", () => {
    expect(formatFilenameToTitle("my_document.pdf")).toBe("My document");
    expect(formatFilenameToTitle("my-document.pdf")).toBe("My document");
  });

  it("should split camelCase but keep the uppercase letter", () => {
    // The regex inserts a space before uppercase but doesn't lowercase it
    expect(formatFilenameToTitle("myDocument.pdf")).toBe("My Document");
  });

  it("should capitalize first letter", () => {
    expect(formatFilenameToTitle("hello.txt")).toBe("Hello");
  });

  it("should truncate long filenames with ellipsis", () => {
    const longName = "a".repeat(60) + ".pdf";
    const result = formatFilenameToTitle(longName);
    expect(result.length).toBeLessThanOrEqual(51); // 50 + ellipsis
    expect(result).toContain("…");
  });

  it("should respect custom maxLength", () => {
    const result = formatFilenameToTitle("hello world.pdf", 5);
    // Capitalize happens first: "Hello world", then truncate to 5 chars
    expect(result).toBe("Hello…");
  });

  it("should handle empty string", () => {
    expect(formatFilenameToTitle("")).toBe("");
  });

  it("should only remove the last extension", () => {
    // The regex /\\.[^/.]+$/ only removes the last extension
    expect(formatFilenameToTitle("archive.tar.gz")).toBe("Archive.tar");
  });
});
