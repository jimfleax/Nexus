/**
 * @file page.tsx
 * @description Renders the public terms of service page.
 * @architecture Next.js App Router server component for static marketing pages.
 */
import { MarkdownViewer } from "@/components/markdown-viewer";
import Link from "next/link";
import { ArrowLeft, Hexagon } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const termsMarkdown = `
# Terms of Service

**Effective Date:** September 1, 2026

Welcome to Nexus. By accessing or using our application, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using our knowledge workspace platform.

## 1. Acceptance of Terms

By creating an account, signing in via third-party providers (Google or GitHub), or using any part of the Nexus application, you agree to comply with and be bound by these Terms. If you do not agree to these Terms, you must not use our services.

## 2. Description of Service

Nexus provides a digital workspace for organizing research, knowledge lists, projects, and resources. We reserve the right to modify, suspend, or discontinue the service (or any part of it) at any time without prior notice.

## 3. User Accounts and Security

- You must authenticate using a valid Google or GitHub account to use Nexus.
- You are responsible for maintaining the security of your authentication credentials and your account.
- You are fully responsible for all activities that occur under your account.

## 4. Acceptable Use

You agree not to use Nexus to:
- Upload, post, or store any content that is unlawful, harmful, defamatory, or violates any third party's rights.
- Attempt to hack, destabilize, or adapt the service or its underlying infrastructure.
- Transmit any worms, viruses, or code of a destructive nature.

## 5. Intellectual Property

The Nexus platform, including its original content, design, features, and functionality, are owned by Nexus and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You retain ownership over any data, links, or notes you save within your workspace.

## 6. Limitation of Liability

In no event shall Nexus, its developers, or its affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.

## 7. Governing Law

These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which Nexus operates, without regard to its conflict of law provisions.

## 8. Contact

For any questions regarding these Terms, please contact us at support@nexus.local.
`;

/**
 * @desc Server component rendering the terms of service
 * @returns {JSX.Element}
 */
export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 selection:bg-[#dec9e9] selection:text-[#6247aa]">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center px-4 py-4 sm:px-6">
          <Link
            href="/signin"
            className="flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-[#6247aa]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
          <div className="flex-1" />
          <div className="flex items-center space-x-2 text-[#6247aa]">
            <Hexagon className="h-6 w-6" />
            <span className="font-semibold tracking-tight">Nexus</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
          <MarkdownViewer content={termsMarkdown} />
        </div>
      </main>
    </div>
  );
}
