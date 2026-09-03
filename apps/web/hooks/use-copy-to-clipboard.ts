/**
 * @file use-copy-to-clipboard.ts
 * @description Hook to copy text to the system clipboard and temporarily show a success state.
 * @architecture Wraps the navigator.clipboard API in a React-friendly interface with automatic state reset.
 */
import { useState, useCallback } from "react";

/**
 * @desc Copies string text to clipboard and manages a temporary "copied" boolean state.
 * @param {number} [timeoutMs=2000] - How long the copied state remains true before resetting
 * @returns {Object} Object containing `copied` (boolean) and `copy` (async function)
 */
export function useCopyToClipboard(timeoutMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeoutMs);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    },
    [timeoutMs],
  );

  return { copied, copy };
}
