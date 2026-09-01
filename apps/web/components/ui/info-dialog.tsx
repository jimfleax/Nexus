"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInfo } from "@/hooks/use-info";
import { formatDate } from "@/lib/utils";
import { InfoDto } from "@nexus/shared";

type InfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "project" | "list" | "resource";
  id: string;
};

export function InfoDialog({ open, onOpenChange, type, id }: InfoDialogProps) {
  const { data: info, isLoading, isError } = useInfo(type, id, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{type} Info</DialogTitle>
          <DialogDescription>
            Metadata and statistics for this {type}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 text-sm text-foreground">
          {isLoading && <div className="text-[#6247aa]">Loading...</div>}
          {isError && <div className="text-red-500">Failed to load info.</div>}
          {info && (
            <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-3">
              <span className="font-semibold text-[#6247aa]">Name:</span>
              <span className="break-words">{info.name}</span>

              {info.description && (
                <>
                  <span className="font-semibold text-[#6247aa]">Description:</span>
                  <span className="break-words">{info.description}</span>
                </>
              )}

              {info.type === "project" && info.listCount !== undefined && (
                <>
                  <span className="font-semibold text-[#6247aa]">Collections:</span>
                  <span>{info.listCount}</span>
                </>
              )}

              {(info.type === "project" || info.type === "list") &&
                info.resourceCount !== undefined && (
                  <>
                    <span className="font-semibold text-[#6247aa]">Resources:</span>
                    <span>{info.resourceCount}</span>
                  </>
                )}

              {info.type === "resource" && (
                <>
                  <span className="font-semibold text-[#6247aa]">Type:</span>
                  <span className="capitalize">{info.resourceType}</span>

                  {info.size !== undefined && (
                    <>
                      <span className="font-semibold text-[#6247aa]">Size:</span>
                      <span>{(info.size / 1024).toFixed(2)} KB</span>
                    </>
                  )}

                  {info.status && (
                    <>
                      <span className="font-semibold text-[#6247aa]">Status:</span>
                      <span className="capitalize">{info.status}</span>
                    </>
                  )}

                  {info.readingTime && (
                    <>
                      <span className="font-semibold text-[#6247aa]">Reading Time:</span>
                      <span>{info.readingTime}</span>
                    </>
                  )}
                </>
              )}

              <span className="font-semibold text-[#6247aa]">Created:</span>
              <span>{formatDate(info.createdAt)}</span>

              <span className="font-semibold text-[#6247aa]">Modified:</span>
              <span>{formatDate(info.updatedAt)}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
