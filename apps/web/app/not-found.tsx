/**
 * @file not-found.tsx
 * @description Global 404 page shown for unknown routes, with a link back home.
 */

import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

/**
 * @desc    Render the 404 fallback with a return-home link
 * @returns {JSX.Element} The not-found message UI
 */
export default function NotFound() {
  return (
    <ErrorState
      fullPage
      severity="warning"
      statusCode={404}
      title="This resource isn’t here"
      description="It may have moved, or the link may be incomplete."
      action={
        <Button variant="outline" render={<Link href="/" />}>
          Return home
        </Button>
      }
    />
  );
}
