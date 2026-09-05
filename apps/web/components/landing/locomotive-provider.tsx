/**
 * @file locomotive-provider.tsx
 * @description Client-side provider that initializes Locomotive Scroll on mount.
 */
"use client";

import { useEffect } from "react";

export function LocomotiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let locomotiveScroll: { destroy: () => void } | null = null;

    (async () => {
      const LocomotiveScroll = (await import("locomotive-scroll")).default;
      locomotiveScroll = new LocomotiveScroll({
        lenisOptions: {
          lerp: 0.05, // Slower interpolation for smoother scroll
          duration: 2.0, // Longer duration for smooth scrolling
          smoothWheel: true,
          wheelMultiplier: 0.8, // Slightly slow down the mouse wheel speed
        },
      });
    })();

    return () => {
      if (locomotiveScroll) locomotiveScroll.destroy();
    };
  }, []);

  return <>{children}</>;
}
