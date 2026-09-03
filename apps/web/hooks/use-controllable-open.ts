/**
 * @file use-controllable-open.ts
 * @description Hook to manage component open/closed state that can be either controlled or uncontrolled.
 * @architecture Allows UI components (like Dialogs) to seamlessly switch between local state management and parent-controlled state.
 */
import { useState } from "react";

/**
 * @desc Returns open state and a setter that syncs with props if controlled, or uses local state if uncontrolled.
 * @param {boolean} [openProp] - Optional parent-controlled open state
 * @param {Function} [onOpenChange] - Optional callback when open state changes
 * @returns {Object} Object containing `open` (boolean) and `setOpen` (function)
 */
export function useControllableOpen(
  openProp?: boolean,
  onOpenChange?: (open: boolean) => void,
) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = isControlled ? onOpenChange || (() => {}) : setOpenState;
  return { open, setOpen };
}
