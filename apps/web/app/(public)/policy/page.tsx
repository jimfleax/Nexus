import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-sections";

export const metadata = {
  title: "Privacy Policy | Nexus",
  description: "Privacy Policy for Nexus Workspace",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#2d1b4e] flex flex-col font-sans selection:bg-[#6247aa]/40">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#2d1b4e]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-3 text-white/80 transition-colors hover:text-white group"
          >
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col items-center pt-32 pb-24 px-4 sm:px-6">
        {/* Ambient Glow */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 size-[600px] sm:size-[800px] bg-[#6247aa] rounded-full blur-[150px] opacity-20 pointer-events-none" />

        {/* Glass Container */}
        <div className="w-full max-w-4xl relative z-10 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 sm:p-12 md:p-16 shadow-2xl">
          <div className="mb-12 border-b border-white/10 pb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4 drop-shadow-sm">
              Privacy Policy
            </h1>
            <p className="text-lg text-[#dec9e9]/70 font-light">
              Last updated:{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="space-y-10 text-zinc-300 font-light leading-relaxed text-lg">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                1. Information We Collect
              </h2>
              <p>
                When you use Nexus, we collect the following types of
                information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#dec9e9]/80">
                <li>
                  <strong className="text-white font-medium">
                    Account Information:
                  </strong>{" "}
                  Your email address and basic profile details required for
                  authentication.
                </li>
                <li>
                  <strong className="text-white font-medium">
                    Content Data:
                  </strong>{" "}
                  The projects, lists, and resources you create and store within
                  the platform.
                </li>
                <li>
                  <strong className="text-white font-medium">
                    Usage Data:
                  </strong>{" "}
                  Anonymous analytics on how you interact with the interface to
                  help us improve the experience.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                2. How We Use Your Data
              </h2>
              <p>
                Your data is strictly used to provide, maintain, and improve the
                Nexus service. We do not sell your personal data or content to
                third parties. Your knowledge workspace is private to you.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                3. Data Storage and Security
              </h2>
              <p>
                We use industry-standard encryption to protect your data both in
                transit and at rest. While no service is completely secure, we
                take significant measures to safeguard your information against
                unauthorized access, alteration, or destruction.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                4. Third-Party Services
              </h2>
              <p>
                We use trusted third-party sub-processors for infrastructure
                hosting (e.g., Vercel, MongoDB) and authentication. These
                providers are bound by strict confidentiality and data
                protection agreements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                5. Your Rights
              </h2>
              <p>
                You have full control over your data. You can access, export,
                modify, or permanently delete your account and all associated
                content at any time through your account settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                6. Cookies
              </h2>
              <p>
                We use essential cookies strictly to keep you logged in and
                secure your session. We do not use intrusive tracking cookies or
                cross-site advertising scripts.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                7. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy or how your
                data is handled, please reach out to us at{" "}
                <a
                  href="mailto:privacy@nexus.app"
                  className="text-white font-medium hover:underline"
                >
                  privacy@nexus.app
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Reuse the massive premium footer */}
      <LandingFooter />
    </div>
  );
}
