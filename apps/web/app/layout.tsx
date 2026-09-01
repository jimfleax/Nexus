/**
 * @file layout.tsx
 * @description Root layout for the entire Nexus app: wraps every page in <html>/<body>, loads web fonts and global CSS, and exports site-wide metadata.
 * @architecture Server component. Sora/Nunito/Atkinson/Inter/Merriweather/Literata/EB Garamond fonts are loaded via next/font/google and exposed as CSS variables consumed by the reading typography.
 */

import type { Metadata } from "next";
import "./globals.css";
import {
  Sora,
  Nunito,
  Merriweather,
  Atkinson_Hyperlegible,
  Inter,
  Literata,
  EB_Garamond,
} from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});
const literata = Literata({ subsets: ["latin"], variable: "--font-literata" });
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
});

import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#6247aa",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: {
    default: "Nexus — Knowledge workspace",
    template: "%s | Nexus",
  },
  description: "A quiet home for your research and learning.",
  applicationName: "Nexus",
  authors: [{ name: "Nexus Team" }],
  generator: "Next.js",
  keywords: [
    "knowledge",
    "workspace",
    "research",
    "learning",
    "notes",
    "nexus",
  ],
  creator: "Nexus",
  publisher: "Nexus",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Nexus — Knowledge workspace",
    description: "A quiet home for your research and learning.",
    url: "/",
    siteName: "Nexus",
    images: [
      {
        url: "/nexus-icon-master-2048x2048.png",
        width: 2048,
        height: 2048,
        alt: "Nexus Cover",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus — Knowledge workspace",
    description: "A quiet home for your research and learning.",
    creator: "@nexus",
    images: ["/nexus-icon-master-2048x2048.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/nexus-icon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/nexus-icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/nexus-icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/nexus-icon-256x256.png", sizes: "256x256", type: "image/png" },
      {
        url: "/nexus-icon-1024x1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon-180x180.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "Nexus",
    statusBarStyle: "default",
    capable: true,
  },
};
/**
 * @desc    Render the document shell, applying all font variables and rendering children inside <body>
 * @param   {Readonly<{children: React.ReactNode}>} props - The page content to render
 * @returns {JSX.Element} The <html>/<body> wrapper
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans",
        sora.variable,
        nunito.variable,
        atkinson.variable,
        inter.variable,
        merriweather.variable,
        literata.variable,
        ebGaramond.variable,
      )}
    >
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
export const maxDuration = 60;
