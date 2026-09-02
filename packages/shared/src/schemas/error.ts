import { z } from "zod";

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
