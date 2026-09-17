import { z } from "zod";

export const PdfProgressSchema = z.object({
  userId: z.string(),
  documentUrl: z.string(),
  currentPage: z.number().min(1),
  maxPageReached: z.number().min(1),
  lastReadAt: z.string().datetime(),
});

export const UpsertPdfProgressRequestSchema = z.object({
  documentUrl: z.string(),
  currentPage: z.number().min(1),
  maxPageReached: z.number().min(1),
});

export type PdfProgress = z.infer<typeof PdfProgressSchema>;
export type UpsertPdfProgressRequest = z.infer<
  typeof UpsertPdfProgressRequestSchema
>;
