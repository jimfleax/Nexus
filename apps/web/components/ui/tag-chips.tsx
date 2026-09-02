"use client";

/**
 * @file tag-chips.tsx
 * @description Reusable tag chip list. Phase 5F — eliminates P6 duplication between resource-card and resource-page.
 */
import { cn } from "@/lib/utils";

export function TagChips({
  tags,
  className,
}: {
  tags: string[];
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <>
      {tags.map((t) => (
        <span
          key={t}
          className={cn(
            "rounded-md bg-[#6247aa] px-1.5 py-0.5 text-xs text-white",
            className,
          )}
        >
          {t}
        </span>
      ))}
    </>
  );
}
