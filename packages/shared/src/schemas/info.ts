import { z } from "zod";

export const InfoSchema = z.object({
  id: z.string(),
  type: z.enum(["project", "list", "resource"]),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  listCount: z.number().optional(),
  resourceCount: z.number().optional(),
  resourceType: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  status: z.string().optional(),
  readingTime: z.string().optional(),
});

export type InfoDto = z.infer<typeof InfoSchema>;
