import { useState } from "react";

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
