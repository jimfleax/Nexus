"use client";

/**
 * @file error-state.tsx
 * @description Error-state surface with severity-themed icon badge, title, description, and optional actions.
 *              Supports inline use (nested in pages/sections) and a fullPage variant for route-level fallbacks.
 * @architecture Generic UI atom sibling to EmptyState; severity maps to the app's neutral purple or destructive red palette.
 */
import type { Icon } from "@phosphor-icons/react";
import { WarningCircle } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ErrorStateSeverity = "info" | "warning" | "critical";

type ErrorStateProps = {
  icon?: Icon;
  title: string;
  description?: string;
  severity?: ErrorStateSeverity;
  statusCode?: number;
  action?: ReactNode;
  onRetry?: () => void;
  fullPage?: boolean;
  className?: string;
};

const severityBadge: Record<
  ErrorStateSeverity,
  {
    badge: string;
    icon: string;
    title: string;
    retryVariant: "default" | "destructive";
  }
> = {
  info: {
    badge: "bg-[#dec9e9]/50 ring-1 ring-[#d2b7e5]",
    icon: "text-[#6247aa]",
    title: "text-[#6247aa]",
    retryVariant: "default",
  },
  warning: {
    badge: "bg-[#dec9e9]/60 ring-1 ring-[#b185db]",
    icon: "text-[#815ac0]",
    title: "text-[#6247aa]",
    retryVariant: "default",
  },
  critical: {
    badge: "bg-[#a83232]/10 ring-1 ring-[#a83232]/30",
    icon: "text-[#a83232]",
    title: "text-[#a83232]",
    retryVariant: "destructive",
  },
};

/**
 * @desc    Render a severity-themed error state with optional status code, actions, and retry
 * @param   {ErrorStateProps} props - Icon, copy, severity, status code, actions, and layout flag
 * @returns {JSX.Element} The error-state UI
 */
export function ErrorState({
  icon: IconEl = WarningCircle,
  title,
  description,
  severity = "warning",
  statusCode,
  action,
  onRetry,
  fullPage = false,
  className,
}: ErrorStateProps) {
  const theme = severityBadge[severity];
  const [isRetrying, setIsRetrying] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        fullPage && "min-h-[60svh] justify-center py-24",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-full",
          theme.badge,
        )}
      >
        <IconEl
          className={cn("size-7", theme.icon)}
          weight="duotone"
          aria-hidden="true"
        />
      </div>
      {typeof statusCode === "number" && (
        <p className="mt-4 text-sm font-medium text-[#815ac0]">{statusCode}</p>
      )}
      <h3 className={cn("mt-4 font-serif text-xl", theme.title)}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#9163cb]">
          {description}
        </p>
      )}
      {(action || onRetry) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {onRetry && (
            <Button
              variant={theme.retryVariant}
              disabled={isRetrying}
              onClick={() => {
                setIsRetrying(true);
                onRetry();
              }}
            >
              {isRetrying && <Spinner className="mr-1.5 size-4" />}
              {isRetrying ? "Retrying..." : "Try again"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
