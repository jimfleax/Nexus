/**
 * @file user.ts
 * @description Zod schemas for user settings and storage metrics, shared between the API and web client.
 * @architecture Provides settings update contracts plus the metrics and Drive-quota DTOs consumed by the settings page.
 */

import { z } from "zod";

/**
 * @constant {z.ZodObject} UserSettingsSchema
 * @description Serialized user settings DTO.
 */
export const UserSettingsSchema = z.object({
  driveRefreshToken: z.string().nullable().optional(),
});

/**
 * @constant {z.ZodObject} UpdateUserSettingsSchema
 * @description Validation contract for updating user settings.
 */
export const UpdateUserSettingsSchema = z.object({
  driveRefreshToken: z.string().nullable().optional(),
});

/**
 * @constant {z.ZodObject} DriveMetricsSchema
 * @description Drive quota/connection snapshot included in user metrics.
 */
export const DriveMetricsSchema = z.object({
  connected: z.boolean(),
  usedInDrive: z.number().nullable(),
  limit: z.number().nullable(),
  remaining: z.number().nullable(),
});

/**
 * @constant {z.ZodObject} UserMetricsSchema
 * @description Aggregate storage and count metrics returned by the user metrics endpoint.
 */
export const UserMetricsSchema = z.object({
  usedByNexus: z.number(),
  resourceCount: z.number(),
  projectCount: z.number(),
  listCount: z.number(),
  byType: z.record(z.string(), z.number()),
  drive: DriveMetricsSchema,
});

export type UserSettingsDto = z.infer<typeof UserSettingsSchema>;
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;
export type DriveMetricsDto = z.infer<typeof DriveMetricsSchema>;
export type UserMetricsDto = z.infer<typeof UserMetricsSchema>;
