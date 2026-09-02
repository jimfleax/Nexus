/**
 * @file loading.tsx
 * @description Dashboard boot loader: draws and erases the Nexus "N" icon
 *   in a seamless loop using SVG stroke animation.
 */

import { NexusLoader } from "@/components/ui/nexus-loader";

export default function Loading() {
  return <NexusLoader />;
}
