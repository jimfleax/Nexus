/**
 * @file landing-hero.tsx
 * @description Hero section for the Nexus public landing page.
 * @architecture Client component: pinned section with a 3D fluid WebGL backdrop using GSAP ScrollTrigger.
 */
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import VariableProximity from "@/components/ui/variable-proximity";
import dynamic from "next/dynamic";
import { useScroll } from "motion/react";
import { ChevronDown } from "lucide-react";

import { FoldText } from "@/components/ui/fold-text";

const ThreejsBackground = dynamic(
  () =>
    import("@/components/landing/threejs-background").then(
      (mod) => mod.ThreejsBackground,
    ),
  { ssr: false },
);

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const nexusRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=300%", // Pins for 300vh of scrolling
        pin: pinRef.current,
        scrub: 2.5, // 2.5 seconds of smoothing interpolation on fast scroll or Home key
      },
    });

    // Scroll indicator fades out immediately
    tl.to(
      scrollIndicatorRef.current,
      {
        opacity: 0,
        y: 20,
        ease: "power2.out",
        duration: 0.5,
      },
      0,
    );

    // Nexus floats up and fades out
    tl.to(
      nexusRef.current,
      {
        opacity: 0,
        y: -80,
        ease: "power2.inOut",
        duration: 1,
      },
      0,
    );

    // Description characters unfold and float up
    if (descRef.current) {
      gsap.set(descRef.current, { opacity: 1 }); // Remove FOUC wrapper hide
      const pieces = descRef.current.querySelectorAll(".fold-text-piece");
      tl.fromTo(
        pieces,
        {
          opacity: 0,
          y: 20,
          rotateX: -90, // Match the initial FoldText state
          "--fold-crease": 0.55,
        },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          "--fold-crease": 0,
          stagger: { amount: 1 },
          ease: "power3.out",
          duration: 0.2,
          clearProps: "willChange",
        },
        0.8, // slight delay after Nexus fades out
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const descriptionText =
    "Nexus is a personal-knowledge workspace that keeps your projects, lists, and resources in one calm place.";

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        ref={pinRef}
        className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#2d1b4e]"
      >
        <ThreejsBackground scrollYProgress={scrollYProgress} />

        <div
          ref={nexusRef}
          className="absolute flex items-center justify-center z-10 px-4"
        >
          <div ref={textRef}>
            <VariableProximity
              label="Nexus"
              className="variable-proximity-demo relative text-white"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 800"
              containerRef={textRef}
              radius={140}
              falloff="exponential"
              style={{ fontSize: "clamp(3.5rem, 14vw, 10rem)" }}
            />
          </div>
        </div>

        <div
          ref={descRef}
          className="absolute z-10 max-w-4xl px-6 text-center"
          style={{ opacity: 0 }}
        >
          <FoldText
            text={descriptionText}
            splitBy="word"
            hinge="top"
            trigger="none"
            perspective={700}
            creaseShading={0.55}
            className="leading-tight"
            fontSize="2.5em"
            fontWeight={800}
            color="rgba(255, 255, 255, 0.7)"
          />
        </div>

        {/* Scroll Indicator */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-white/50"
        >
          <span className="text-xs font-semibold tracking-[0.2em] uppercase">
            Keep scrolling to explore
          </span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
