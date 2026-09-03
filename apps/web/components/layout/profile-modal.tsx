"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { UserIdentity } from "@/components/ui/user-identity";

/**
 * @file profile-modal.tsx
 * @description Profile dialog showing the session user plus workspace usage metrics (Drive storage, resource/project counts, storage by type).
 * @architecture Dialog triggered from the sidebar user banner; metrics load via useUserMetrics inside a Suspense boundary.
 */
import { Suspense } from "react";
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
import { Skeleton } from "boneyard-js/react";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { useUserMetrics, metricsKeys } from "@/hooks/use-user-metrics";
import { signOut } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RESOURCE_LABELS, RESOURCE_COLORS } from "@/lib/resource-meta";

/**
 * @desc    Skeleton fallback while metrics load
 */
function MetricSkeleton() {
  return (
    <Skeleton name="profile-metrics" loading={true}>
      {null}
    </Skeleton>
  );
}

/**
 * @desc    Render Drive storage, resource/project counts, and storage-by-type metrics
 * @returns {JSX.Element} The metrics panels
 */
function MetricContent() {
  const { data } = useUserMetrics();
  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: () => apiClient.user.disconnectDrive(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metricsKeys.all() });
    },
  });

  const totalByType = Object.values(data.byType).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-3" data-boneyard="profile-metrics">
      {/* Storage */}
      {data.drive.connected ? (
        <div className="rounded-xl border border-[#dec9e9] bg-[#f8f4fb] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6247aa]">
              <CloudCheck className="size-3.5" /> Google Drive
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#9163cb]">
                {formatBytes(data.drive.usedInDrive)}
              </span>
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="text-xs font-medium text-[#a83232] hover:underline disabled:opacity-50"
                    disabled={disconnectMutation.isPending}
                  >
                    Disconnect
                  </button>
                }
                title="Disconnect Google Drive"
                description="Are you sure you want to disconnect? Your files will remain in Drive, but Nexus won't be able to access them."
                confirmText="Disconnect"
                cancelText="Cancel"
                isDestructive
                onConfirm={() => disconnectMutation.mutate()}
              />
            </div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dec9e9]">
            <div
              className="h-full rounded-full bg-nexus-gradient"
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
            onClick={() =>
              (window.location.href = "/api/integrations/google-drive")
            }
          >
            Connect Google Drive
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
                      RESOURCE_COLORS[type] || "bg-[#dec9e9]",
                    )}
                  />
                  <span className="w-20 text-[#6247aa]">
                    {RESOURCE_LABELS[type] || type}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dec9e9]">
                    <div
                      className="h-full rounded-full bg-nexus-gradient"
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
    </div>
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
            {collapsed ? (
              <UserAvatar user={user} className="size-8" />
            ) : (
              <UserIdentity user={user} className="gap-3 w-full" />
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
            <UserAvatar user={user} className="size-[72px]" />
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
              onConfirm={() => void signOut()}
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
