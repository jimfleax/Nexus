/**
 * @file empty-state.tsx
 * @description Empty-state placeholder with icon, title, description, and optional action.
 */
"use client";

import type { Icon } from "@phosphor-icons/react";
import { FolderOpen } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * @desc    Render a centered empty-state block with optional action
 * @param   {EmptyStateProps} props - Icon, title, description, optional action node
 * @returns {JSX.Element} The empty-state UI
 */
export function EmptyState({
  icon: IconEl = FolderOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-[#dec9e9]/50 ring-1 ring-[#d2b7e5]">
        <IconEl className="size-7 text-[#6247aa]" weight="duotone" />
      </div>
      <h3 className="mt-4 font-serif text-xl text-[#6247aa]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#9163cb]">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
