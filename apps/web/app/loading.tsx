/**
 * @file loading.tsx
 * @description Suspense fallback shown while route segments load, using skeleton placeholders.
 */

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @desc    Render skeleton placeholders for the app shell while content streams in
 * @returns {JSX.Element} A stack of skeleton blocks
 */
export default function Loading() {
  return (
    <div className="flex flex-col space-y-4 w-full">
      <Skeleton className="h-10 w-52" />
      <Skeleton className="mt-4 h-5 w-96 max-w-full" />
      <div className="mt-10 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
