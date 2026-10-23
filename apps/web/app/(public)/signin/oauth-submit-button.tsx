"use client";

/**
 * @file oauth-submit-button.tsx
 * @description Client-side navigation button for provider OAuth sign-in. Initiates a native top-level browser navigation to bypass Next.js App Router SPA interception.
 * @architecture Client Component that executes window.location.assign to ensure a clean document-level navigation to the backend OAuth initiation route.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface OAuthSubmitButtonProps {
  provider: "google";
  href: string;
  children: React.ReactNode;
}

/**
 * @desc Renders an OAuth sign-in button that executes a native browser navigation and displays a spinner.
 */
export function OAuthSubmitButton({ href, children }: OAuthSubmitButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    window.location.assign(href);
  };

  return (
    <Button
      type="button"
      size="lg"
      variant="secondary"
      disabled={loading}
      onClick={handleClick}
      className="w-full justify-center bg-white border border-zinc-200 shadow-sm text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900 font-medium transition-colors cursor-pointer"
    >
      {loading && <Spinner className="mr-2 size-4" />}
      {children}
    </Button>
  );
}
