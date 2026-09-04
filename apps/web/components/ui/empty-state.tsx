"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * @file empty-state.tsx
 * @description Empty-state placeholder with icon, title, description, and optional action.
 */
import type { Icon } from "@phosphor-icons/react";
import { FolderOpen, FileX } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "boneyard-js/react";

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

export function NotFound({
  title,
  description,
  backUrl = "/projects",
}: {
  title: string;
  description: string;
  backUrl?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-[#dec9e9] p-4 text-[#6247aa]">
        <FileX className="size-8" />
      </div>
      <h2 className="font-serif text-2xl text-[#6247aa]">{title}</h2>
      <p className="mt-2 text-[#9163cb]">{description}</p>
      <Link
        href={backUrl}
        className={buttonVariants({
          variant: "outline",
          className: "mt-6 border-[#dec9e9] text-[#6247aa]",
        })}
      >
        Go back
      </Link>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton name="breadcrumb" loading>
        {null}
      </Skeleton>
      <Skeleton name="resource-viewer" loading>
        {null}
      </Skeleton>
    </div>
  );
}
