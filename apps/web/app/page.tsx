/**
 * @file page.tsx
 * @description Public landing homepage served at / for unauthenticated viewers. When a valid
 *   session cookie is present, authenticated users are sent to their dashboard home at /home.
 * @architecture Server component. Resolves the session once via getSessionUser and conditionally
 *   redirects to /home, otherwise renders the brand landing page (nav, hero, sections, footer).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  LandingWorkspace,
  LandingFooter,
} from "@/components/landing/landing-sections";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LocomotiveProvider } from "@/components/landing/locomotive-provider";

export const metadata: Metadata = {
  title: "Nexus — A quiet home for your research and learning",
  description:
    "Nexus is a personal-knowledge workspace that keeps your projects, lists, and resources in one calm place.",
  openGraph: {
    title: "Nexus — Knowledge workspace",
    description: "A quiet home for your research and learning.",
    url: "/",
    siteName: "Nexus",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

/**
 * @desc    Render the public landing homepage, redirecting authenticated users to /home
 * @returns {Promise<JSX.Element>} The landing page composition
 */
export default async function LandingPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/home");
  }

  return (
    <LocomotiveProvider>
      <div className="min-h-screen bg-white text-zinc-900 antialiased">
        <main>
          <LandingHero />
          <LandingFeatures />
          <LandingWorkspace />
        </main>
        <LandingFooter />
      </div>
    </LocomotiveProvider>
  );
}
