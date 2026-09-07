import { z } from "zod";

/**
 * Wraps a Zod schema for array responses. Instead of failing the entire array if one element is invalid,
 * it safely parses each element, filters out the failures, logs them to the console, and returns only the valid elements.
 */
export function safeArrayResponse<T extends z.ZodTypeAny>(schema: T) {
  return z.array(z.unknown()).transform((arr) => {
    return arr.reduce((acc: z.infer<T>[], item) => {
      const result = schema.safeParse(item);
      if (result.success) {
        acc.push(result.data);
      } else {
        console.error("[SafeArrayResponse] Filtered corrupt item:", item);
        console.error("[SafeArrayResponse] Validation errors:", result.error);
      }
      return acc;
    }, []);
  });
}
