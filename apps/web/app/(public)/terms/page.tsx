import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-sections";

export const metadata = {
  title: "Terms of Service | Nexus",
  description: "Terms of Service for Nexus Workspace",
};

export default function TermsPage() {
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
              Terms of Service
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
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using Nexus (&quot;the Service&quot;), you
                agree to be bound by these Terms of Service. If you do not agree
                to these terms, please do not use the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                2. Description of Service
              </h2>
              <p>
                Nexus is a personal knowledge workspace designed to help users
                organize research, tasks, and learning materials. We reserve the
                right to modify, suspend, or discontinue the Service at any
                time, with or without notice.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                3. User Accounts
              </h2>
              <p>
                You are responsible for maintaining the security of your account
                and password. Nexus cannot and will not be liable for any loss
                or damage from your failure to comply with this security
                obligation. You must provide accurate and complete information
                when creating an account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                4. User Content
              </h2>
              <p>
                You retain all rights to the content you post in Nexus. By
                posting content, you grant us a license to host, store, and
                display that content solely for the purpose of providing the
                Service to you. We do not claim ownership of your data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                5. Acceptable Use
              </h2>
              <p>
                You agree not to use the Service for any unlawful purpose or in
                any way that interrupts, damages, or impairs the Service. This
                includes, but is not limited to, distributing malware,
                attempting to breach security, or scraping data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                6. Limitation of Liability
              </h2>
              <p>
                Nexus is provided &quot;as is&quot; without any warranties. In
                no event shall Nexus be liable for any indirect, incidental,
                special, consequential, or punitive damages resulting from your
                use of the Service or any loss of data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-white tracking-wide">
                7. Changes to Terms
              </h2>
              <p>
                We may update these terms from time to time. We will notify
                users of any material changes by posting the new Terms of
                Service on this page. Your continued use of the Service after
                changes constitutes acceptance of the new terms.
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
