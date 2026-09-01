import { MarkdownViewer } from "@/components/markdown-viewer";
import Link from "next/link";
import { ArrowLeft, Hexagon } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

const privacyMarkdown = `
# Privacy Policy

**Effective Date:** September 1, 2026

Welcome to Nexus ("we," "our," or "us"). We are committed to protecting your privacy and ensuring your personal information is handled in a safe and responsible manner. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application and use our knowledge workspace services.

## 1. Information We Collect

### Personal Information
When you sign in using third-party authentication providers (such as Google or GitHub), we collect basic profile information provided by these services, which may include your name, email address, and profile picture.

### Usage Data
We collect information about how you interact with Nexus, such as the projects, lists, and resources you create, modify, or delete, to provide you with a seamless and reliable experience.

## 2. How We Use Your Information

We use the information we collect to:
- Provide, operate, and maintain our application.
- Authenticate your identity and manage your user session.
- Store and organize your projects, lists, and resources.
- Improve our services and develop new features.
- Communicate with you regarding updates, support, or security alerts.

## 3. Data Storage and Security

Your data is stored securely using industry-standard encryption and security practices. We use MongoDB Atlas for database storage, ensuring high availability and robust data protection. While we implement safeguards to protect your personal information, please note that no method of transmission over the Internet or method of electronic storage is 100% secure.

## 4. Third-Party Services

We use third-party services, such as Google and GitHub for authentication. These third parties have their own privacy policies governing the use of your information. We encourage you to review their privacy practices.

## 5. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date."

## 6. Contact Us

If you have any questions or concerns about this Privacy Policy, please contact us at support@nexus.local.
`;

export default function PrivacyPolicyPage() {
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
          <MarkdownViewer content={privacyMarkdown} />
        </div>
      </main>
    </div>
  );
}
