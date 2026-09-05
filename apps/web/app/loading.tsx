/**
 * @file loading.tsx
 * @description Dashboard boot loader: draws and erases the Nexus "N" icon
 *   in a seamless loop using SVG stroke animation.
 * @architecture Global loading fallback component.
 */

import { NexusLoader } from "@/components/ui/nexus-loader";

/**
 * @desc Renders the global loading animation.
 */
export default function Loading() {
  return <NexusLoader />;
}
