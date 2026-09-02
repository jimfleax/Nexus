import { describe, it, expect } from "vitest";
import { cn, formatBytes, formatDate, formatFilenameToTitle } from "../utils";

describe("Web Utils", () => {
  describe("formatBytes", () => {
    it("handles 0", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("handles null/undefined/NaN", () => {
      // The function signature takes number, so we cast to any for edge cases
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatBytes(null as any)).toBe("—");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatBytes(undefined as any)).toBe("—");
      expect(formatBytes(NaN)).toBe("—");
    });

    it("handles < 1024 bytes (i=0)", () => {
      expect(formatBytes(1023)).toBe("1023 B");
      expect(formatBytes(100)).toBe("100 B");
    });

    it("handles exactly 1024 bytes (1 KB)", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
    });

    it("handles decimals and units correctly", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1048576)).toBe("1.0 MB");
      expect(formatBytes(1073741824 * 1.5)).toBe("1.5 GB");
      expect(formatBytes(Math.pow(1024, 5) * 2)).toBe("2.0 PB"); // PetaByte (units array has PB but not TB in standard snippet, assume standard progression)
    });

    it("applies the value >= 100 boundary rule", () => {
      // 102400 is exactly 100 * 1024
      // i = 1 (KB), value = 100. Rule: value >= 100 ? 0 : 1 -> 0 decimals -> "100 KB"
      expect(formatBytes(100 * 1024)).toBe("100 KB");
      // 99.9 * 1024 -> 99.9 KB -> < 100 -> 1 decimal
      expect(formatBytes(102297.6)).toBe("99.9 KB");
    });
  });

  describe("formatDate", () => {
    it("handles null/undefined/invalid", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDate(null as any)).toBe("—");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(formatDate(undefined as any)).toBe("—");
      expect(formatDate("not-a-date")).toBe("—");
    });

    it("formats ISO string correctly", () => {
      // Use UTC string and specify expected local timezone behavior, OR
      // just test Date object parsing
      const iso = "2024-03-05T12:00:00Z";
      const date = new Date(iso);
      const expected = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
      expect(formatDate(iso)).toBe(expected);
      expect(formatDate(date)).toBe(expected);
    });

    it("formats date-only string consistently", () => {
      const str = "2024-03-05";
      const expected = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(str));
      expect(formatDate(str)).toBe(expected);
    });
  });

  describe("formatFilenameToTitle", () => {
    it("strips extension and replaces underscores with spaces", () => {
      expect(formatFilenameToTitle("my_document (2).pdf")).toBe(
        "My document (2)",
      );
    });

    it("replaces hyphens with spaces", () => {
      expect(formatFilenameToTitle("report-final-v3.pdf")).toBe(
        "Report final v3",
      );
    });

    it("splits camelCase", () => {
      expect(formatFilenameToTitle("monthlyReport.docx")).toBe(
        "Monthly report",
      );
    });

    it("splits PascalCase", () => {
      expect(formatFilenameToTitle("QuarterlyReport.xlsx")).toBe(
        "Quarterly report",
      );
    });

    it("does not split acronym prefixes before PascalCase incorrectly", () => {
      // L followed by G (HTMLGuide) triggers [a-z][A-Z] split on L and G.
      // So HTMLGuide -> HTML Guide.
      expect(formatFilenameToTitle("HTMLGuide.md")).toBe("HTML Guide");
    });

    it("strips ONLY the last extension when multiple exist", () => {
      expect(formatFilenameToTitle("archive.tar.gz")).toBe("Archive.tar");
    });

    it("leaves already-capitalized first letter unchanged", () => {
      expect(formatFilenameToTitle("Report.pdf")).toBe("Report");
    });

    it("applies maxLength truncation", () => {
      expect(
        formatFilenameToTitle("a_very_long_file_name_indeed.pdf", 10),
      ).toBe("A very lon…");
    });

    it("handles files with no extension", () => {
      expect(formatFilenameToTitle("notes")).toBe("Notes");
    });

    it("collapses empty or all-symbol names to empty string", () => {
      expect(formatFilenameToTitle("___")).toBe("");
    });

    it("trims leading and trailing spaces", () => {
      expect(formatFilenameToTitle(" file .txt")).toBe("File");
    });
  });
});
describe("cn", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isHidden = false as boolean;
    const result = cn("base", isHidden && "hidden", "extra");
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
