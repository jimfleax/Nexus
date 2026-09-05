/**
 * @file locomotive-provider.tsx
 * @description Client-side provider that initializes Locomotive Scroll on mount.
 * @architecture Wraps the application to provide smooth scrolling capabilities via Locomotive Scroll.
 */
"use client";

import { useEffect } from "react";

/**
 * @desc Provides Locomotive Scroll context to its children.
 * @param {{ children: React.ReactNode }} props - React children
 * @returns {JSX.Element}
 */
export function LocomotiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let locomotiveScroll: { destroy: () => void } | null = null;

    (async () => {
      // Dynamically import locomotive-scroll to avoid SSR issues
      const LocomotiveScroll = (await import("locomotive-scroll")).default;
      locomotiveScroll = new LocomotiveScroll();
    })();

    return () => {
      // Cleanup the scroll instance on unmount
      if (locomotiveScroll) locomotiveScroll.destroy();
    };
  }, []);

  return <>{children}</>;
}
