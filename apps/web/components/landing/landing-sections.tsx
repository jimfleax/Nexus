"use client";

/**
 * @file landing-sections.tsx
 * @description Boilerplate sections for the Nexus public landing page: features,
 *   workspace highlight, and footer. Each section is intentionally minimal so it can
 *   be fleshed out progressively.
 * @architecture Server components rendered by the app/page.tsx landing homepage.
 */
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
/**
 * @desc    Workspace / call-to-action section anchored at #workspace and #get-started
 * @returns {JSX.Element} The workspace CTA section
 */
export function LandingWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const subtitleWords =
    "Sign in to start collecting your first project, list, and resource. A quiet home for your research and learning.".split(
      " ",
    );

  useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    const ctx = gsap.context(() => {
      if (!titleRef.current || !buttonRef.current || !subtitleRef.current)
        return;

      // Initial centered positions
      gsap.set(titleRef.current, {
        top: "50%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
      });
      gsap.set(subtitleRef.current, {
        top: "60%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
      });
      gsap.set(buttonRef.current, {
        top: "75%",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
        scale: 0,
        opacity: 0,
      });

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
              end: isMobile ? "+=200%" : "+=1000%",
              scrub: 2.5,
              pin: true,
              invalidateOnRefresh: true,
            },
          });

          // Phase 1: Shrink the massive title and move it up
          tl.to(
            titleRef.current,
            {
              scale: 0.7,
              xPercent: -35,
              top: "35%",
              duration: 2,
              ease: "power2.inOut",
            },
            0,
          );

          // Phase 2: "Type out" the subtitle
          tl.to(
            ".subtitle-word",
            {
              opacity: 1,
              duration: 2,
              stagger: 0.1,
              ease: "none",
            },
            1.5,
          );

          // Phase 3: Pop the button in
          tl.to(
            buttonRef.current,
            {
              scale: 1,
              opacity: 1,
              duration: 1,
              ease: "back.out(2)",
            },
            3.5,
          );

          // Phase 4: Prepare for 50/50 Footer Split!
          tl.to(
            titleRef.current,
            {
              top: "75%",
              left: "5vw",
              xPercent: 0,
              scale: 0.5,
              duration: 2,
              ease: "power2.inOut",
            },
            5,
          );

          tl.to(
            buttonRef.current,
            {
              top: "75%",
              left: "95vw",
              xPercent: -100,
              duration: 2,
              ease: "power2.inOut",
            },
            5,
          );

          tl.to(
            subtitleRef.current,
            {
              opacity: 0,
              duration: 1,
              ease: "power2.inOut",
            },
            5,
          );
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="workspace"
      ref={containerRef}
      className="relative h-screen w-full bg-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#dec9e9]/20 via-white to-white pointer-events-none" />

      <h2
        ref={titleRef}
        id="get-started"
        className="absolute w-max max-w-[90vw] text-5xl sm:text-6xl md:text-7xl leading-tight font-bold tracking-tighter text-[#2b1547] text-center m-0 origin-left"
      >
        Ready to build your Nexus?
      </h2>

      <p
        ref={subtitleRef}
        className="absolute text-lg sm:text-xl md:text-2xl text-[#2b1547] font-light w-[90vw] max-w-3xl leading-relaxed text-center"
      >
        {subtitleWords.map((word, i) => (
          <span key={i}>
            <span className="subtitle-word opacity-10">{word}</span>
            {i !== subtitleWords.length - 1 && " "}
          </span>
        ))}
      </p>

      <div ref={buttonRef} className="absolute origin-center">
        <Button
          size="lg"
          className="h-16 px-12 text-xl rounded-2xl bg-[#6247aa] hover:bg-[#815ac0] transition-colors shadow-lg hover:shadow-xl text-white font-medium"
          nativeButton={false}
          render={<Link href="/signin" />}
        >
          Get started — it’s free
        </Button>
      </div>
    </section>
  );
}

/**
 * @desc    Public footer with brand, legal links, and a note
 * @returns {JSX.Element} The landing footer
 */
export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-[#2d1b4e] min-h-[50vh] h-auto md:h-[50vh] flex flex-col justify-between overflow-hidden py-12 md:py-0">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 size-96 bg-[#6247aa] rounded-full blur-[120px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 size-96 bg-[#dec9e9] rounded-full blur-[120px] opacity-10 pointer-events-none" />

      {/* Main Footer Content */}
      <div className="mx-auto flex w-full max-w-6xl flex-col md:flex-row justify-between gap-12 px-6 md:pt-24 relative z-10">
        {/* Brand Column */}
        <div className="flex flex-col gap-6 max-w-md">
          <div className="flex items-center gap-5 text-white">
            <Image
              src="/DarkIcon.png"
              alt="Nexus Icon"
              width={80}
              height={80}
              className="w-20 h-20 object-contain drop-shadow-2xl"
            />
            <span className="font-nunito font-bold text-5xl tracking-tight text-white drop-shadow-sm">
              Nexus
            </span>
          </div>
          <p className="text-[#dec9e9]/80 text-xl leading-relaxed font-light mt-2 max-w-sm">
            Your personal knowledge workspace.
          </p>
        </div>

        {/* Links Columns */}
        <div className="flex gap-8 md:gap-28 pt-4">
          <div className="flex flex-col gap-2 md:gap-5">
            <h4 className="text-white font-semibold text-lg tracking-wide uppercase mb-2 md:mb-0">
              Platform
            </h4>
            <Link
              href="/signin"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Login
            </Link>
            <Link
              href="/signin"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Sign Up
            </Link>
            <Link
              href="/#features"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Features
            </Link>
          </div>
          <div className="flex flex-col gap-2 md:gap-5">
            <h4 className="text-white font-semibold text-lg tracking-wide uppercase mb-2 md:mb-0">
              Legal
            </h4>
            <Link
              href="/terms"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Terms
            </Link>
            <Link
              href="/policy"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Privacy
            </Link>
            <a
              href="mailto:reetabrata.bhandari@gmail.com"
              className="text-[#dec9e9]/70 hover:text-white transition-colors text-lg py-3 block"
            >
              Contact
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-white/10 mx-6 md:mx-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 mt-12">
        <p className="text-base text-[#dec9e9]/50 font-light tracking-wide">
          © {new Date().getFullYear()} Nexus Workspace. All rights reserved.
        </p>
        <div className="flex items-center gap-1.5 text-base text-[#dec9e9]/50 font-light">
          <span>Made with</span>
          <Heart className="size-4 text-rose-500 fill-rose-500" />
          <span>by</span>
          <a
            href="https://jimfleax.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#dec9e9] hover:text-white transition-colors font-medium"
          >
            Reetabrata
          </a>
        </div>
      </div>
    </footer>
  );
}
