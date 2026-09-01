/**
 * @file knowledge-list.ts
 * @description Zod schemas for the knowledge-list domain, shared between the API and web client.
 * @architecture Provides create/update/reorder input schemas plus the serialized KnowledgeListSchema used for API responses.
 */

import { z } from "zod";

/**
 * @constant {z.ZodObject} CreateKnowledgeListSchema
 * @description Validation contract for creating a knowledge list within a project.
 */
export const CreateKnowledgeListSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

/**
 * @constant {z.ZodObject} UpdateKnowledgeListSchema
 * @description Validation contract for partially updating a knowledge list.
 */
export const UpdateKnowledgeListSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional(),
});

/**
 * @constant {z.ZodObject} ReorderKnowledgeListSchema
 * @description Validation contract for bulk position updates when reordering lists.
 */
export const ReorderKnowledgeListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      position: z.number(),
    }),
  ),
});

/**
 * @constant {z.ZodObject} KnowledgeListSchema
 * @description Serialized knowledge-list DTO returned by the API.
 */
export const KnowledgeListSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  position: z.number(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type CreateKnowledgeListInput = z.infer<
  typeof CreateKnowledgeListSchema
>;
export type UpdateKnowledgeListInput = z.infer<
  typeof UpdateKnowledgeListSchema
>;
export type ReorderKnowledgeListInput = z.infer<
  typeof ReorderKnowledgeListSchema
>;
export type KnowledgeListDto = z.infer<typeof KnowledgeListSchema>;
