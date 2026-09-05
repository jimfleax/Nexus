/**
 * @file resource.ts
 * @description Zod schemas for the resource domain, shared between the API and web client.
 * @architecture Provides type, status, create/update input schemas, and the serialized ResourceSchema used for API responses.
 */

import { z } from "zod";

/**
 * @constant {z.ZodEnum} ResourceTypeSchema
 * @description Valid resource type discriminator.
 */
export const ResourceTypeSchema = z.enum([
  "markdown",
  "pdf",
  "image",
  "ebook",
  "text",
  "url",
  "note",
  "chat",
]);

/**
 * @constant {z.ZodObject} CreateResourceSchema
 * @description Validation contract for creating a resource inside a knowledge list.
 */
export const CreateResourceSchema = z.object({
  projectId: z.string(),
  listId: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  type: ResourceTypeSchema,
  mimeType: z.string().optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  size: z.number().optional(),
  tags: z.array(z.string()).default([]),
  isFavorite: z.boolean().default(false),
});

/**
 * @constant {z.ZodObject} UpdateResourceSchema
 * @description Validation contract for partially updating a resource.
 */
export const UpdateResourceSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  listId: z.string().optional(),
  projectId: z.string().optional(),
  type: ResourceTypeSchema.optional(),
  mimeType: z.string().optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  size: z.number().optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

/**
 * @constant {z.ZodEnum} ResourceStatusSchema
 * @description Storage lifecycle status: pending upload, ready, or error.
 */
export const ResourceStatusSchema = z.enum(["pending", "ready", "error"]);

/**
 * @constant {z.ZodObject} ResourceSchema
 * @description Serialized resource DTO returned by the API.
 */
export const ResourceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  listId: z.string(),
  title: z.string(),
  type: ResourceTypeSchema,
  mimeType: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  size: z.number().optional(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  status: ResourceStatusSchema.default("ready"),
  checksum: z.string().optional(),
  uploadUri: z.string().optional(),
  driveFileId: z.string().optional(),
  lastOpenedAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  readingTime: z.string().optional(),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
export type ResourceDto = z.infer<typeof ResourceSchema>;
