/**
 * @file page.tsx
 * @description Sign-in page offering Google OAuth via direct links to Fastify auth routes.
 * @architecture Renders sign-in buttons as anchor links to /api/auth/google,
 *   proxied to the Fastify backend which handles the full OAuth flow and issues the nexus-session cookie.
 */
import { OAuthSubmitButton } from "./oauth-submit-button";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * @desc    Render the sign-in card with provider buttons; each form GETs the Fastify OAuth initiation endpoint
 * @returns {JSX.Element} The sign-in UI
 */
export default function SignInPage() {
  return (
    <BackgroundGradientAnimation
      containerClassName="min-h-screen w-full"
      className="flex min-h-screen w-full items-center justify-center p-4 selection:bg-[#6247aa]/40"
    >
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-6 md:px-12">
          <Link
            href="/"
            className="flex items-center gap-3 text-white/80 transition-colors hover:text-white group drop-shadow-md"
          >
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </nav>

      {/* Split Layout Container */}
      <div className="relative z-50 flex w-full max-w-7xl flex-col lg:flex-row min-h-[80vh] items-center justify-between gap-16 px-6 md:px-12 mt-16">
        {/* Left Section */}
        <div className="flex w-full lg:w-1/2 flex-col gap-10 text-left h-full justify-center">
          <div className="flex flex-col gap-8">
            <Image
              src="/DarkIcon.png"
              alt="Nexus Icon"
              width={64}
              height={64}
              className="h-16 w-16 object-contain drop-shadow-lg"
            />
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-sm">
              Sign in to your <br />
              <span className="text-[#dec9e9]">Nexus Workspace</span>
            </h1>
            <p className="text-xl text-zinc-200 font-light max-w-md leading-relaxed">
              Continue where you left off. Access your research, tasks, and
              knowledge in one calm place.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-zinc-300">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                className="text-white font-medium hover:underline underline-offset-4"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/policy"
                className="text-white font-medium hover:underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Right Section (Glass Card) */}
        <div className="flex w-full lg:w-1/2 justify-center lg:justify-end">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] p-10 md:p-12">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight drop-shadow-sm">
                Welcome Back
              </h2>
              <p className="text-zinc-300 font-light">
                Use your Google account to continue
              </p>
            </div>

            <form
              action={`${(process.env.API_URL || "http://localhost:8080").replace(/\/+$/, "")}/api/auth/google`}
              method="GET"
            >
              <OAuthSubmitButton provider="google">
                <svg
                  className="mr-3 h-5 w-5"
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
                Continue with Google
              </OAuthSubmitButton>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-300">
              <svg
                className="size-4 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Secure authentication via Google</span>
            </div>
          </div>
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}
