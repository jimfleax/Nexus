/**
 * @file page.tsx
 * @description Sign-in page offering Google OAuth via direct links to Fastify auth routes.
 * @architecture Renders sign-in buttons as anchor links to /api/auth/google,
 *   proxied to the Fastify backend which handles the full OAuth flow and issues the nexus-session cookie.
 */
import { OAuthSubmitButton } from "./oauth-submit-button";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { Hexagon } from "lucide-react";
import Link from "next/link";

/**
 * @desc    Render the sign-in card with provider buttons; each form GETs the Fastify OAuth initiation endpoint
 * @returns {JSX.Element} The sign-in UI
 */
export default function SignInPage() {
  return (
    <BackgroundGradientAnimation
      containerClassName="h-screen w-full"
      className="flex h-full w-full items-center justify-center p-4"
    >
      <div className="relative z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center p-8 pt-10 text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Hexagon className="h-7 w-7 text-white" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-zinc-400">
            Sign in to your Nexus workspace
          </p>
        </div>

        <div className="flex flex-col gap-3 p-8 pt-0">
          <form action="/api/auth/google" method="GET">
            <OAuthSubmitButton provider="google">
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Sign in with Google
            </OAuthSubmitButton>
          </form>
        </div>
        <div className="border-t border-white/10 bg-white/5 p-6 text-center">
          <p className="text-xs text-zinc-500">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/policy" className="underline hover:text-zinc-300">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
