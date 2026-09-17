import { describe, it, expect } from "vitest";
import {
  PdfProgressSchema,
  UpsertPdfProgressRequestSchema,
} from "./pdf-progress";

describe("PdfProgress Schemas", () => {
  it("should validate a correct PdfProgress object", () => {
    const validData = {
      userId: "user_123",
      documentUrl: "/docs/sample.pdf",
      currentPage: 5,
      maxPageReached: 10,
      lastReadAt: "2026-09-17T22:04:00Z",
    };
    const result = PdfProgressSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should fail if currentPage is less than 1", () => {
    const invalidData = {
      userId: "user_123",
      documentUrl: "/docs/sample.pdf",
      currentPage: 0,
      maxPageReached: 10,
      lastReadAt: "2026-09-17T22:04:00Z",
    };
    const result = PdfProgressSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should validate a correct Upsert request", () => {
    const validData = {
      documentUrl: "/docs/sample.pdf",
      currentPage: 2,
      maxPageReached: 2,
    };
    const result = UpsertPdfProgressRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
