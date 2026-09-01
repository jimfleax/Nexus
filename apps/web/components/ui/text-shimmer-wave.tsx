/**
 * @file text-shimmer-wave.tsx
 * @description Text component that animates a per-character shimmer wave with 3D depth using Framer Motion.
 * @architecture Client component applying staggered keyframe animations to each character span via CSS vars for base/shimmer colors.
 */
"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

export type TextShimmerWaveProps = {
  children: string;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  baseColor?: string;
  shimmerColor?: string;
  zDistance?: number;
  xDistance?: number;
  yDistance?: number;
  spread?: number;
  scaleDistance?: number;
  rotateYDistance?: number;
  transition?: Transition;
  style?: React.CSSProperties;
};

/**
 * @desc    Render text with an animated per-character shimmer wave
 * @param   {TextShimmerWaveProps} props - Text and animation tuning
 * @returns {JSX.Element} The shimmering text
 */
export function TextShimmerWave({
  children,
  as: Component = "p",
  className,
  duration = 1,
  baseColor,
  shimmerColor,
  zDistance = 10,
  xDistance = 2,
  yDistance = -2,
  spread = 1,
  scaleDistance = 1.1,
  rotateYDistance = 10,
  transition,
  style,
}: TextShimmerWaveProps) {
  return (
    <Component
      className={cn("relative inline-block [perspective:500px]", className)}
      style={
        {
          ...style,
          "--base-color":
            baseColor ?? "color-mix(in oklab, currentColor 55%, transparent)",
          "--base-gradient-color": shimmerColor ?? "currentColor",
        } as React.CSSProperties
      }
    >
      {children.split("").map((char, i) => {
        const delay = (i * duration * (1 / spread)) / children.length;

        return (
          <motion.span
            key={i}
            className={cn(
              "inline-block whitespace-pre [transform-style:preserve-3d]",
            )}
            initial={{
              translateZ: 0,
              scale: 1,
              rotateY: 0,
              color: "var(--base-color)",
            }}
            animate={{
              translateZ: [0, zDistance, 0],
              translateX: [0, xDistance, 0],
              translateY: [0, yDistance, 0],
              scale: [1, scaleDistance, 1],
              rotateY: [0, rotateYDistance, 0],
              color: [
                "var(--base-color)",
                "var(--base-gradient-color)",
                "var(--base-color)",
              ],
            }}
            transition={{
              duration: duration,
              repeat: Infinity,
              repeatDelay: (children.length * 0.05) / spread,
              delay,
              ease: "easeInOut",
              ...transition,
            }}
          >
            {char}
          </motion.span>
        );
      })}
    </Component>
  );
}
