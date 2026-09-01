/**
 * @file skeleton.tsx
 * @description Pulsing placeholder block used during loading states.
 * @architecture Generic UI atom reused by data-skeletons and route loading fallbacks.
 */
import { cn } from "@/lib/utils";

/**
 * @desc    Render an animated skeleton block
 * @param   {React.ComponentProps<"div">} props - Standard div props
 * @returns {JSX.Element} The skeleton block
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
