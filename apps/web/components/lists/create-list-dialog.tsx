/**
 * @file create-list-dialog.tsx
 * @description Modal for creating a list inside a project, with a project picker when no project is pre-selected.
 * @architecture Client component; supports controlled or self-managed open state and creates via useCreateList.
 */
"use client";

import { useState } from "react";
import { FolderPlus } from "@phosphor-icons/react";
import { useProjects } from "@/hooks/use-projects";
import { useCreateList } from "@/hooks/use-lists";
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
 * @desc    Render a create-list dialog with optional custom trigger or controlled state
 * @param   {Object} props - Pre-selected project, trigger element, and optional controlled open state
 * @returns {JSX.Element} The dialog
 */
export function CreateListDialog({
  projectId: initialProjectId,
  trigger,
  open,
  onOpenChange,
}: {
  projectId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled
    ? onOpenChange || (() => {})
    : setInternalOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { data: projects = [] } = useProjects();
  const { mutateAsync: createList, isPending } = useCreateList();

  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId ?? projects[0]?.id ?? "",
  );

  const activeProjectId = initialProjectId || selectedProjectId;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !activeProjectId) return;
    await createList({
      projectId: activeProjectId,
      input: { projectId: activeProjectId, name, description },
    });
    setName("");
    setDescription("");
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== null && (
        <DialogTrigger
          render={
            trigger ? (
              (trigger as React.ReactElement)
            ) : (
              <Button
                variant="outline"
                className="gap-2 border-[#dec9e9] bg-white text-[#6247aa] hover:bg-[#dec9e9]"
              >
                <FolderPlus className="size-4 text-[#6247aa]" />
                <span>New List</span>
              </Button>
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create a list</DialogTitle>
            <DialogDescription>
              Lists keep related resources together within a project collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!initialProjectId && (
              <div className="space-y-1.5">
                <label
                  htmlFor="list-project"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  Target Project <span className="text-[#a83232]">*</span>
                </label>
                <select
                  id="list-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-[#6247aa] outline-none"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="list-name"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                List Name <span className="text-[#a83232]">*</span>
              </label>
              <Input
                id="list-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for this collection"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="list-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Description
              </label>
              <Input
                id="list-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this collection hold?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#dec9e9]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !activeProjectId || isPending}
              className="bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm"
            >
              {isPending && <Spinner className="mr-1.5 size-4" />}
              {isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
