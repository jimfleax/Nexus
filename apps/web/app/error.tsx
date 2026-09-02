"use client";

/**
 * @file error.tsx
 * @description Global error boundary for the app, showing a friendly fallback when a render fails.
 */
import { ErrorState } from "@/components/ui/error-state";

/**
 * @desc    Render the global error fallback with a refresh prompt
 * @param   {{error: Error & {digest?: string}; reset: () => void}} props - Error object and reset callback
 * @returns {JSX.Element} The error message UI
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      fullPage
      severity="critical"
      title="Something went wrong"
      description="Please refresh the page and try again. If the problem persists, contact support."
      onRetry={reset}
    />
  );
}
