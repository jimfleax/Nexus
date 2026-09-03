"use client";

/**
 * @file oauth-submit-button.tsx
 * @description Client-side submit button for provider OAuth sign-in forms. Uses React's useFormStatus to show a spinner while the server action is pending.
 */
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface OAuthSubmitButtonProps {
  provider: "google";
  children: React.ReactNode;
}

export function OAuthSubmitButton({ children }: OAuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      variant="secondary"
      disabled={pending}
      className="w-full justify-center bg-white text-zinc-950 hover:bg-zinc-200"
    >
      {pending && <Spinner className="mr-2 size-4" />}
      {children}
    </Button>
  );
}
