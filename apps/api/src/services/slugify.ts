/**
 * @file slugify.ts
 * @description Reusable slug generation function extracted from duplicated inline logic in project and list routes.
 * @architecture Pure function — no dependencies, fully testable in isolation.
 */

/**
 * @desc    Convert a human-readable name into a URL-safe slug
 * @param   {string} name - The input name to slugify
 * @returns {string} A lowercase, hyphenated slug with leading/trailing hyphens stripped
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
