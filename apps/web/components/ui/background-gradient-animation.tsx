"use client";

/**
 * @file background-gradient-animation.tsx
 * @description Animated gradient backdrop with drifting colored blobs and an interactive pointer glow, themed purple for Nexus.
 * @architecture Client component applying CSS custom props for the palette and animating blob layers on the provided color variables; pointer tracking uses requestAnimationFrame easing.
 */
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

/**
 * @desc    Render an animated gradient container with optional mouse-driven pointer glow
 * @param   {Object} props - Palette, animation, and layout options
 * @returns {JSX.Element} The gradient background
 */
export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "#6247aa",
  gradientBackgroundEnd = "#2d1b4e",
  firstColor = "90, 60, 150",
  secondColor = "110, 75, 170",
  thirdColor = "120, 80, 180",
  fourthColor = "130, 70, 170", // Reduced brightness further per user request
  fifthColor = "100, 70, 165",
  pointerColor = "160, 120, 200",
  size = "100%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const curX = useRef(0);
  const curY = useRef(0);
  const tgX = useRef(0);
  const tgY = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        "--gradient-background-start",
        gradientBackgroundStart,
      );
      containerRef.current.style.setProperty(
        "--gradient-background-end",
        gradientBackgroundEnd,
      );
      containerRef.current.style.setProperty("--first-color", firstColor);
      containerRef.current.style.setProperty("--second-color", secondColor);
      containerRef.current.style.setProperty("--third-color", thirdColor);
      containerRef.current.style.setProperty("--fourth-color", fourthColor);
      containerRef.current.style.setProperty("--fifth-color", fifthColor);
      containerRef.current.style.setProperty("--pointer-color", pointerColor);
      containerRef.current.style.setProperty("--size", size);
      containerRef.current.style.setProperty("--blending-value", blendingValue);
    }
  }, [
    gradientBackgroundStart,
    gradientBackgroundEnd,
    firstColor,
    secondColor,
    thirdColor,
    fourthColor,
    fifthColor,
    pointerColor,
    size,
    blendingValue,
  ]);

  useEffect(() => {
    let animationFrameId: number;
    function move() {
      if (!interactiveRef.current) {
        return;
      }
      curX.current = curX.current + (tgX.current - curX.current) / 20;
      curY.current = curY.current + (tgY.current - curY.current) / 20;
      interactiveRef.current.style.transform = `translate(${Math.round(
        curX.current,
      )}px, ${Math.round(curY.current)}px)`;
      animationFrameId = requestAnimationFrame(move);
    }

    move();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (interactiveRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      tgX.current = event.clientX - rect.left;
      tgY.current = event.clientY - rect.top;
    }
  };

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    const isSaf = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSaf) {
      setTimeout(() => setIsSafari(true), 0);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={cn(
        "relative overflow-hidden bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName,
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("relative z-10", className)}>{children}</div>
      <div
        className={cn(
          "gradients-container absolute inset-0 h-full w-full blur-lg pointer-events-none",
          isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]",
        )}
      >
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--first-color),_1)_0,_rgba(var(--first-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:center_center]`,
            `animate-first`,
            `opacity-100`,
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_1)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-400px)]`,
            `animate-second`,
            `opacity-100`,
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_1)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%+400px)]`,
            `animate-third`,
            `opacity-100`,
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_1)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-200px)]`,
            `animate-fourth`,
            `opacity-70`,
          )}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_1)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
            `animate-fifth`,
            `opacity-100`,
          )}
        ></div>

        {interactive && (
          <div
            ref={interactiveRef}
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.8)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2`,
              `opacity-70`,
            )}
          ></div>
        )}
      </div>
    </div>
  );
};
