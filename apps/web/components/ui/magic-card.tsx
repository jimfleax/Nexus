"use client";

/**
 * @file magic-card.tsx
 * @description Animated card effects (spotlight, border glow, tilt, magnetism, ripple, star particles) driven by GSAP, with a container that tracks the cursor.
 * @architecture Client components using CSS variables injected per card and GSAP tweens attached to pointer events; animations auto-disable on mobile.
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

export interface MagicContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  enableSpotlight?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
  disableAnimations?: boolean;
}

/**
 * @desc    Container that feeds cursor coords into each .magic-card child as CSS variables for spotlight/border effects
 * @param   {MagicContainerProps} props - Spotlight and glow options
 * @returns {JSX.Element} The magic container
 */
export function MagicContainer({
  children,
  className,
  enableSpotlight = true,
  spotlightRadius = 300,
  glowColor = "129, 90, 192",
  disableAnimations = false,
  ...props
}: MagicContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const shouldDisableAnimations = disableAnimations || isMobile;

  useEffect(() => {
    if (!enableSpotlight || shouldDisableAnimations) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll(".magic-card");

      cards.forEach((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        (card as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
        (card as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
        (card as HTMLElement).style.setProperty(
          "--spotlight-radius",
          `${spotlightRadius}px`,
        );
        (card as HTMLElement).style.setProperty(
          "--glow-color",
          `rgba(${glowColor}, 0.08)`,
        );
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [enableSpotlight, shouldDisableAnimations, spotlightRadius, glowColor]);

  return (
    <div
      ref={containerRef}
      className={cn("magic-container", className)}
      {...props}
    >
      <style>{`
        .magic-card {
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .magic-card:hover {
          border-color: rgba(${glowColor}, 0.4) !important;
        }

        .magic-spotlight-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            var(--spotlight-radius) circle at var(--mouse-x) var(--mouse-y),
            var(--glow-color),
            transparent 80%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }

        .magic-card:hover .magic-spotlight-overlay {
          opacity: 1;
        }

        .magic-border-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            var(--spotlight-radius) circle at var(--mouse-x) var(--mouse-y),
            rgba(${glowColor}, 0.8),
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 10;
        }

        .magic-card:hover .magic-border-glow {
          opacity: 1;
        }
      `}</style>
      {children}
    </div>
  );
}

/**
 * @desc    Create a DOM particle element at the given position
 * @param   {number} x - Horizontal position
 * @param   {number} y - Vertical position
 * @param   {string} color - RGB triplet for the particle
 * @returns {HTMLDivElement} The particle element
 */
const createParticleElement = (
  x: number,
  y: number,
  color: string,
): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

export interface MagicCardProps extends React.HTMLAttributes<HTMLElement> {
  enableStars?: boolean;
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  particleCount?: number;
  glowColor?: string;
  disableAnimations?: boolean;
  as?: React.ElementType;
  href?: string;
}

/**
 * @desc    Interactive card with tilt, magnetism, click ripple, and hover star particles
 * @param   {MagicCardProps} props - Animations and polymorphic element options
 * @returns {JSX.Element} The magic card
 */
export const MagicCard = React.forwardRef<HTMLElement, MagicCardProps>(
  (
    {
      children,
      className,
      enableStars = false,
      enableBorderGlow = true,
      enableTilt = true,
      enableMagnetism = true,
      clickEffect = true,
      particleCount = 12,
      glowColor = "129, 90, 192", // Default purple shade for colorful components
      disableAnimations = false,
      as: Component = "div",
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLElement>(null);
    const particlesRef = useRef<HTMLDivElement[]>([]);
    const timeoutsRef = useRef<number[]>([]);
    const isHoveredRef = useRef(false);
    const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

    // Merge refs
    const setRefs = useCallback(
      (node: HTMLElement) => {
        internalRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLElement>).current = node;
        }
      },
      [forwardedRef],
    );

    const clearAllParticles = useCallback(() => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      magnetismAnimationRef.current?.kill();
      particlesRef.current.forEach((particle) => {
        gsap.to(particle, {
          scale: 0,
          opacity: 0,
          duration: 0.3,
          ease: "back.in(1.7)",
          onComplete: () => {
            particle.parentNode?.removeChild(particle);
          },
        });
      });
      particlesRef.current = [];
    }, []);

    const animateParticles = useCallback(() => {
      if (!internalRef.current || !isHoveredRef.current || !enableStars) return;
      const { width, height } = internalRef.current.getBoundingClientRect();

      for (let i = 0; i < particleCount; i++) {
        const timeoutId = window.setTimeout(() => {
          if (!isHoveredRef.current || !internalRef.current) return;
          const x = Math.random() * width;
          const y = Math.random() * height;
          const particle = createParticleElement(x, y, glowColor);
          internalRef.current.appendChild(particle);
          particlesRef.current.push(particle);

          gsap.fromTo(
            particle,
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" },
          );

          gsap.to(particle, {
            x: (Math.random() - 0.5) * 100,
            y: (Math.random() - 0.5) * 100,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
        }, i * 100);
        timeoutsRef.current.push(timeoutId);
      }
    }, [particleCount, glowColor, enableStars]);

    useEffect(() => {
      if (disableAnimations || !internalRef.current) return;
      const element = internalRef.current;

      const handleMouseEnter = () => {
        isHoveredRef.current = true;
        if (enableStars) animateParticles();
      };

      const handleMouseLeave = () => {
        isHoveredRef.current = false;
        if (enableStars) clearAllParticles();
        if (enableTilt || enableMagnetism) {
          gsap.to(element, {
            rotateX: 0,
            rotateY: 0,
            x: 0,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
          });
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        if (enableTilt) {
          const rotateX = ((y - centerY) / centerY) * -8;
          const rotateY = ((x - centerX) / centerX) * 8;
          gsap.to(element, {
            rotateX,
            rotateY,
            duration: 0.1,
            ease: "power2.out",
            transformPerspective: 1000,
          });
        }

        if (enableMagnetism) {
          const magnetX = (x - centerX) * 0.05;
          const magnetY = (y - centerY) * 0.05;
          magnetismAnimationRef.current = gsap.to(element, {
            x: magnetX,
            y: magnetY,
            duration: 0.3,
            ease: "power2.out",
          });
        }
      };

      const handleClick = (e: MouseEvent) => {
        if (!clickEffect) return;
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement("div");
        ripple.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(${glowColor}, 0.5);
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        z-index: 1000;
      `;
        element.appendChild(ripple);
        gsap.fromTo(
          ripple,
          { scale: 0, opacity: 1 },
          {
            scale: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            onComplete: () => ripple.remove(),
          },
        );
      };

      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
      element.addEventListener("mousemove", handleMouseMove);
      element.addEventListener("click", handleClick);

      return () => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.removeEventListener("mousemove", handleMouseMove);
        element.removeEventListener("click", handleClick);
        clearAllParticles();
      };
    }, [
      animateParticles,
      clearAllParticles,
      disableAnimations,
      enableTilt,
      enableMagnetism,
      clickEffect,
      glowColor,
      enableStars,
    ]);

    return (
      <Component
        ref={setRefs}
        className={cn("magic-card", className)}
        {...props}
      >
        <div className="magic-spotlight-overlay" />
        {enableBorderGlow && <div className="magic-border-glow" />}
        <div className="relative z-10 h-full w-full">{children}</div>
      </Component>
    );
  },
);

MagicCard.displayName = "MagicCard";
