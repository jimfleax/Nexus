/**
 * @file utils.ts
 * @description Shared formatting and class-composition helpers for the web client.
 * @architecture Combines clsx with tailwind-merge for conditional Tailwind classes and formats byte sizes for the UI.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * @desc    Merge conditional class names with Tailwind-aware conflict resolution
 * @param   {...ClassValue[]} inputs - Class values to merge
 * @returns {string} The merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * @desc    Format a raw byte count into a human-readable size string
 * @param   {number|null|undefined} bytes - The byte count to format
 * @returns {string} Human-readable size, or an em dash when undefined
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "—";
  }
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * @desc    Format a filename into a human-readable resource title
 * @param   {string} filename - The original filename (e.g., "my_document (2).pdf")
 * @param   {number} maxLength - Maximum title length (default: 50)
 * @returns {string} Formatted title (e.g., "My document (2)")
 */
export function formatFilenameToTitle(
  filename: string,
  maxLength: number = 50,
): string {
  // Remove file extension
  const withoutExt = filename.replace(/\.[^/.]+$/, "");

  // Replace hyphens and underscores with spaces
  const withSpaces = withoutExt.replace(/[-_]/g, " ");

  // Split camelCase and PascalCase (insert space before uppercase letters)
  const withCamelSplit = withSpaces
    .replace(/([a-z])([A-Z])/g, (m, p1, p2) => `${p1} ${p2.toLowerCase()}`)
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  // Collapse multiple spaces and trim
  const singleSpaced = withCamelSplit.replace(/\s+/g, " ").trim();

  // Capitalize first character if not already uppercase
  if (singleSpaced.length === 0) return singleSpaced;
  const capitalized =
    singleSpaced.charAt(0).toUpperCase() + singleSpaced.slice(1);

  // Limit length if needed
  if (capitalized.length > maxLength) {
    return capitalized.slice(0, maxLength).trimEnd() + "…";
  }
  return capitalized;
}
