"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { FolderOpen, ListTree, FileText, Search } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    title: "Projects Workspace",
    description: "Organize by domains",
    icon: FolderOpen,
  },
  {
    title: "Knowledge Lists",
    description: "Structured collections",
    icon: ListTree,
  },
  {
    title: "Omniformat Resources",
    description: "Markdown, PDFs, Ebooks, Links",
    icon: FileText,
  },
  {
    title: "Global Search & Quick Access",
    description: "Find anything instantly",
    icon: Search,
  },
];

export function LandingFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !titleRef.current || !cardsRef.current) return;

    // Use gsap.context for React 19 safety and easy cleanup
    const ctx = gsap.context(() => {
      // Initialize center positioning safely without fighting Tailwind
      gsap.set(titleRef.current, { xPercent: -50, yPercent: -50 });
      gsap.set(cardsRef.current, { yPercent: -50 });

      const mm = gsap.matchMedia();

      mm.add(
        {
          isMobile: "(max-width: 768px)",
          isDesktop: "(min-width: 769px)",
        },
        (context) => {
          const { isMobile } = context.conditions as { isMobile: boolean };

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: isMobile ? "+=300%" : "+=800%",
              scrub: 1,
              pin: true,
              invalidateOnRefresh: true,
              snap: {
                snapTo: "labels",
                duration: { min: 0.2, max: 0.8 },
                delay: 0.2,
                ease: "power1.inOut",
              },
            },
          });

          tl.addLabel("start", 0);

          // Phase 1: Title shrinks but not as far out
          tl.to(
            titleRef.current,
            {
              top: "6rem",
              left: "5vw",
              xPercent: 0,
              yPercent: 0,
              scale: 0.4,
              duration: 1,
              ease: "power2.inOut",
            },
            0,
          );

          tl.addLabel("card1", 1); // After title shrinks, Card 1 is visible

          // Phase 2: Cards slide in and stop when the last card is visible
          tl.fromTo(
            cardsRef.current,
            { x: () => window.innerWidth },
            {
              x: () => {
                const scrollW =
                  cardsRef.current?.scrollWidth ?? window.innerWidth;
                const maxScroll = Math.max(
                  0,
                  scrollW - window.innerWidth + window.innerWidth * 0.05,
                );
                return -maxScroll;
              },
              duration: 3,
              ease: "none",
            },
            1,
          );

          // Cards smoothly scroll over 3 seconds. Let's add labels for each card.
          // Total distance covers 4 cards. So card 2 is at time 2, card 3 is at time 3, card 4 is at time 4.
          tl.addLabel("card2", 2);
          tl.addLabel("card3", 3);
          tl.addLabel("card4", 4);
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full bg-[#2d1b4e] overflow-hidden flex items-center justify-center"
    >
      {/* Background radial gradient blob to highlight the frosted glass */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] rounded-full bg-[#6247aa] blur-[150px] opacity-40 pointer-events-none" />

      {/* Massive title */}
      <h2
        ref={titleRef}
        className="absolute top-1/2 left-1/2 z-10 text-6xl sm:text-8xl md:text-[10vw] font-bold text-white tracking-tighter mix-blend-overlay whitespace-nowrap m-0 origin-top-left"
      >
        Features
      </h2>

      {/* Feature Cards Container */}
      <div
        ref={cardsRef}
        className="absolute top-1/2 z-20 flex gap-6 sm:gap-10 px-[5vw]"
      >
        {features.map((feature, i) => (
          <div
            key={i}
            className="w-[280px] h-[250px] sm:w-[380px] sm:h-[300px] shrink-0 rounded-[2rem] p-[1px] bg-gradient-to-b from-white/20 to-white/0 relative overflow-hidden shadow-2xl"
          >
            {/* Frosted Brand Glass Card */}
            <div className="w-full h-full rounded-[calc(2rem-1px)] bg-white/10 hover:bg-white/15 transition-colors duration-500 backdrop-blur-3xl flex flex-col justify-between p-6 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] border-b border-white/5">
              {/* Top Section with Icon and Number */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 border border-white/20 shadow-sm backdrop-blur-md">
                  <feature.icon className="size-7 text-white" />
                </div>
                <div className="text-white/40 text-5xl font-bold tracking-tighter">
                  0{i + 1}
                </div>
              </div>

              {/* Bottom Section with Text */}
              <div className="relative z-10 mt-auto">
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 tracking-tight drop-shadow-sm">
                  {feature.title}
                </h3>
                <p className="text-base sm:text-lg text-white/90 font-medium leading-snug drop-shadow-sm">
                  {feature.description}
                </p>
              </div>

              {/* Decorative soft glow inside card */}
              <div className="absolute -bottom-20 -right-20 size-64 bg-[#dec9e9] rounded-full blur-[80px] opacity-30 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
