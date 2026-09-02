"use client";

/**
 * @file favorite-button.tsx
 * @description Reusable favorite toggle button. Phase 5E — eliminates P5 duplication between resource-card and resource-page.
 */
import { Star } from "@phosphor-icons/react";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  resourceId,
  variant = "icon",
  className,
}: {
  resourceId: string;
  variant?: "icon" | "page";
  className?: string;
}) {
  const { favorites, toggle } = useFavorites();
  const isFav = favorites.has(resourceId);
  const label = isFav ? "Remove from favorites" : "Add to favorites";

  if (variant === "page") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggle(resourceId)}
              className={cn(
                "text-xl text-[#6247aa] hover:text-[#6247aa] hover:bg-[#dec9e9]/30",
                className,
              )}
              aria-label={label}
            />
          }
        >
          {isFav ? "★" : "☆"}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            onClick={() => toggle(resourceId)}
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={cn(
              "mt-0.5",
              isFav
                ? "text-[#6247aa]"
                : "text-[#b185db] opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              className,
            )}
          />
        }
      >
        <Star className={cn("size-4", isFav && "fill-current")} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
