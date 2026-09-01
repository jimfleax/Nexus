/**
 * @file edit-list-dialog.tsx
 * @description Modal for editing or deleting a list, triggered by a custom child element.
 * @architecture Client component; updates via useUpdateList and deletes via useDeleteList (with native confirm) then navigates to the project.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeList } from "@nexus/shared";
import { useUpdateList, useDeleteList } from "@/hooks/use-lists";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * @desc    Render an edit/delete dialog for the given list
 * @param   {{list: KnowledgeList; children: React.ReactNode}} props - The list and trigger element
 * @returns {JSX.Element} The dialog
 */
export function EditListDialog({
  list,
  children,
  open: openProp,
  onOpenChange,
}: {
  list: KnowledgeList;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = isControlled
    ? onOpenChange || (() => {})
    : setOpenState;
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || "");
  const { mutateAsync: updateList, isPending: isUpdating } = useUpdateList();
  const { mutateAsync: deleteList, isPending: isDeleting } = useDeleteList();
  const router = useRouter();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await updateList({
      projectId: list.projectId,
      listId: list.id,
      input: { name, description },
    });
    setOpen(false);
  };

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this list and all its resources?",
      )
    ) {
      await deleteList({ projectId: list.projectId, listId: list.id });
      setOpen(false);
      router.push(`/projects/${list.projectId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined ? (
        <DialogTrigger render={children as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit list</DialogTitle>
            <DialogDescription>
              Update the details of this collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-list-name"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                List Name <span className="text-[#a83232]">*</span>
              </label>
              <Input
                id="edit-list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for this collection"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-list-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Description
              </label>
              <Input
                id="edit-list-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this collection hold?"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={isDeleting || isUpdating}
              className="text-[#a83232] hover:bg-red-50 hover:text-red-700"
            >
              {isDeleting && <Spinner className="mr-1.5 size-3.5" />}
              {isDeleting ? "Deleting..." : "Delete List"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-[#dec9e9]"
                disabled={isDeleting || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || isDeleting || isUpdating}
                className="bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm"
              >
                {isUpdating && <Spinner className="mr-1.5 size-4" />}
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
