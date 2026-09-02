"use client";

import { FormField } from "@/components/ui/form-field";
/**
 * @file rename-dialog.tsx
 * @description Simple controlled modal for renaming an entity: a single name input pre-filled with the current name.
 * @architecture Client component; delegates the actual save to an onSubmit callback so it works for any entity.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancelButton, SubmitButton } from "@/components/ui/dialog-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * @desc    Render a rename dialog with a single name input
 * @param   {Object} props - Controlled open state, current name, copy, and submit handler
 * @returns {JSX.Element} The dialog
 */
export function RenameDialog({
  open,
  onOpenChange,
  name,
  onSubmit,
  title = "Rename",
  label = "Name",
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onSubmit: (name: string) => void;
  title?: string;
  label?: string;
  isPending?: boolean;
}) {
  const [value, setValue] = useState(name);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim() || isPending) return;
    onSubmit(value.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Give it a new name.</DialogDescription>
          </DialogHeader>

          <FormField label="{label}" htmlFor="rename-name" required>
            <Input
              id="rename-name"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={label}
              required
            />
          </FormField>

          <DialogFooter>
            <CancelButton
              onCancel={() => onOpenChange(false)}
              disabled={isPending}
            />
            <SubmitButton
              isPending={isPending}
              pendingText="Saving..."
              disabled={!value.trim()}
            >
              Rename
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
