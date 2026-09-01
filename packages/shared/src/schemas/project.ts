/**
 * @file project.ts
 * @description Zod schemas for the project domain, shared between the API and web client.
 * @architecture Provides create/update input schemas and the serialized ProjectSchema used for API responses and validation.
 */

import { z } from "zod";

/**
 * @constant {z.ZodObject} CreateProjectSchema
 * @description Validation contract for creating a project.
 */
export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
});

/**
 * @constant {z.ZodObject} UpdateProjectSchema
 * @description Validation contract for partially updating a project.
 */
export const UpdateProjectSchema = CreateProjectSchema.partial();

/**
 * @constant {z.ZodObject} ProjectSchema
 * @description Serialized project DTO returned by the API.
 */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  slug: z.string(),
  listCount: z.number().optional().default(0),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectDto = z.infer<typeof ProjectSchema>;
