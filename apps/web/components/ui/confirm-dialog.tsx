"use client";

/**
 * @file confirm-dialog.tsx
 * @description Modal confirmation wrapper: clicking an arbitrary trigger element opens a dialog with confirm/cancel actions.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmDialogProps {
  trigger?: React.ReactElement;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  isNativeButton?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * @desc    Render a confirm dialog that delegates the action to onConfirm
 * @param   {ConfirmDialogProps} props - Trigger element, copy, and confirm handler
 * @returns {JSX.Element} The dialog wrapper
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
  isNativeButton = true,
  open: openProp,
  onOpenChange,
}: ConfirmDialogProps) {
  const { open, setOpen } = useControllableOpen(openProp, onOpenChange);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isLoading && !nextOpen) return;
        setOpen(nextOpen);
      }}
    >
      {trigger ? (
        <DialogTrigger render={trigger} nativeButton={isNativeButton} />
      ) : null}
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
          <DialogClose
            render={
              <Button variant="outline" disabled={isLoading}>
                {cancelText}
              </Button>
            }
          />
          <Button
            variant={isDestructive ? "destructive" : "default"}
            disabled={isLoading}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {isLoading && <Spinner className="mr-1.5 size-4" />}
            {isLoading ? "Confirming..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
