/**
 * @file profile-modal.tsx
 * @description Profile dialog showing the session user plus workspace usage metrics (Drive storage, resource/project counts, storage by type).
 * @architecture Dialog triggered from the sidebar user banner; metrics load via useUserMetrics inside a Suspense boundary.
 */
"use client";

import { Suspense } from "react";
import Image from "next/image";
import { SignOut } from "@phosphor-icons/react";
import {
  HardDrives,
  Folder,
  Files,
  CloudCheck,
  CloudSlash,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { useUserMetrics } from "@/hooks/use-user-metrics";
import { toast } from "sonner";

/**
 * @constant TYPE_LABELS
 * @desc    Human-readable labels for resource types in the storage breakdown
 */
const TYPE_LABELS: Record<string, string> = {
  markdown: "Markdown",
  pdf: "PDF",
  image: "Image",
  ebook: "E-book",
  text: "Text",
};

/**
 * @constant TYPE_COLORS
 * @desc    Accent color per resource type for the storage breakdown legend
 */
const TYPE_COLORS: Record<string, string> = {
  markdown: "bg-[#9163cb]",
  pdf: "bg-[#6247aa]",
  image: "bg-[#815ac0]",
  ebook: "bg-[#a06cd5]",
  text: "bg-[#dec9e9]",
};

/**
 * @desc    Skeleton fallback while metrics load
 */
function MetricSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

/**
 * @desc    Render Drive storage, resource/project counts, and storage-by-type metrics
 * @returns {JSX.Element} The metrics panels
 */
function MetricContent() {
  const { data } = useUserMetrics();

  const totalByType = Object.values(data.byType).reduce((sum, n) => sum + n, 0);

  return (
    <>
      {/* Storage */}
      {data.drive.connected ? (
        <div className="rounded-xl border border-[#dec9e9] bg-[#f8f4fb] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6247aa]">
              <CloudCheck className="size-3.5" /> Google Drive
            </span>
            <span className="text-xs text-[#9163cb]">
              {formatBytes(data.drive.usedInDrive)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dec9e9]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#6247aa,#a06cd5)]"
              style={
                data.drive.limit
                  ? {
                      width: `${Math.min(
                        100,
                        ((data.usedByNexus ?? 0) / data.drive.limit) * 100,
                      )}%`,
                    }
                  : { width: "100%" }
              }
            />
          </div>
          <p className="mt-2 text-xs text-[#9163cb]">
            Used by Nexus: {formatBytes(data.usedByNexus)}
            {data.drive.limit === null
              ? " · unlimited quota"
              : ` · ${formatBytes(data.drive.remaining)} remaining`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-[#dec9e9] bg-[#f8f4fb] p-3 text-xs text-[#9163cb]">
          <div className="flex items-center gap-2">
            <CloudSlash className="size-4 shrink-0" />
            <span>Google Drive not connected.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-[#dec9e9] text-[#6247aa]"
            asChild
          >
            <a href="/api/integrations/google-drive">Connect Google Drive</a>
          </Button>
        </div>
      )}

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-[#dec9e9] p-3">
          <Files className="size-5 text-[#6247aa]" />
          <div>
            <p className="text-lg font-semibold leading-none text-[#6247aa]">
              {data.resourceCount}
            </p>
            <p className="mt-1 text-xs text-[#9163cb]">Resources</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#dec9e9] p-3">
          <Folder className="size-5 text-[#6247aa]" />
          <div>
            <p className="text-lg font-semibold leading-none text-[#6247aa]">
              {data.projectCount}
            </p>
            <p className="mt-1 text-xs text-[#9163cb]">Projects</p>
          </div>
        </div>
      </div>

      {/* Storage by type */}
      {totalByType > 0 ? (
        <div className="rounded-xl border border-[#dec9e9] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6247aa]">
            Storage by type
          </p>
          <div className="space-y-1.5">
            {Object.entries(data.byType)
              .filter(([, size]) => size > 0)
              .map(([type, size]) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-sm",
                      TYPE_COLORS[type] || "bg-[#dec9e9]",
                    )}
                  />
                  <span className="w-20 text-[#6247aa]">
                    {TYPE_LABELS[type] || type}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dec9e9]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#6247aa,#a06cd5)]"
                      style={{ width: `${(size / totalByType) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-[#9163cb]">
                    {formatBytes(size)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        !data.drive.connected && (
          <div className="flex items-center gap-2 rounded-xl border border-[#dec9e9] p-3 text-xs text-[#9163cb]">
            <HardDrives className="size-4" />
            No stored files yet.
          </div>
        )
      )}
    </>
  );
}

/**
 * @desc    Render the profile dialog with avatar and workspace usage metrics
 * @param   {{user: Object; collapsed?: boolean}} props - Session user and collapsed trigger style
 * @returns {JSX.Element} The profile modal
 */
export function ProfileModal({
  user,
  collapsed = false,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  collapsed?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center rounded-lg border border-[#dec9e9] bg-white p-2 text-left shadow-sm transition-colors hover:bg-[#f8f4fb]",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="shrink-0 rounded-full"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6247aa] text-white">
                {user.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
            {!collapsed && (
              <span className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-[#6247aa]">
                  {user.name}
                </span>
                <span className="truncate text-xs text-[#9163cb]">
                  {user.email}
                </span>
              </span>
            )}
          </button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Your account and workspace usage
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          {/* ── Profile side ── */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#dec9e9] p-4 text-center">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || "User"}
                width={72}
                height={72}
                className="shrink-0 rounded-full"
              />
            ) : (
              <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-2xl font-semibold text-white">
                {user.name?.[0]?.toUpperCase() || "U"}
              </span>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-[#6247aa]">
                {user.name}
              </span>
              {user.email && (
                <span className="break-all text-sm text-[#9163cb]">
                  {user.email}
                </span>
              )}
            </div>

            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#dec9e9] bg-[#f8f4fb] px-3 py-2 text-sm font-medium text-[#a83232] transition-colors hover:bg-red-50 hover:text-[#a83232]"
                >
                  <SignOut className="size-4" />
                  Logout
                </button>
              }
              title="Confirm Logout"
              description="Are you sure you want to log out of your account?"
              confirmText="Logout"
              cancelText="Cancel"
              isDestructive
              onConfirm={() =>
                fetch("/api/auth/signout", { method: "POST" })
                  .then((res) => {
                    if (res.ok) window.location.href = "/signin";
                    else toast.error("Failed to sign out");
                  })
                  .catch(() => toast.error("Failed to sign out"))
              }
            />
          </div>

          {/* ── Metrics side ── */}
          <div className="flex flex-col gap-3">
            <Suspense fallback={<MetricSkeleton />}>
              <MetricContent />
            </Suspense>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
