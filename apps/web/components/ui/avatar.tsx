/**
 * @file avatar.tsx
 * @description Base avatar primitive (shadcn style): image with initials fallback.
 * @architecture Generic UI atom; AvatarImage renders when present, otherwise AvatarFallback shows initials.
 */
import * as React from "react";

import { cn } from "@/lib/utils";

type AvatarStatus = "loading" | "loaded" | "error";
const AvatarContext = React.createContext<{
  status: AvatarStatus;
  setStatus: (status: AvatarStatus) => void;
} | null>(null);

/**
 * @desc    Avatar shell (rounded-full, overflow-hidden)
 */
function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  const [status, setStatus] = React.useState<AvatarStatus>("loading");
  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <span
        data-slot="avatar"
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

/**
 * @desc    Avatar image (object-cover, fills the shell)
 */
function AvatarImage({
  className,
  onLoad,
  onError,
  ...props
}: React.ComponentProps<"img">) {
  const context = React.useContext(AvatarContext);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (!props.src) {
      context?.setStatus("error");
      setHasError(true);
    } else {
      context?.setStatus("loading");
      setHasError(false);
    }
  }, [props.src, context]);

  if (hasError || !props.src) return null;

  return (
    <img
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      onLoad={(e) => {
        context?.setStatus("loaded");
        onLoad?.(e);
      }}
      onError={(e) => {
        setHasError(true);
        context?.setStatus("error");
        onError?.(e);
      }}
      {...props}
    />
  );
}

/**
 * @desc    Avatar fallback (initials shown when no image or while loading)
 */
function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  const context = React.useContext(AvatarContext);
  if (context?.status === "loaded") return null;

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
