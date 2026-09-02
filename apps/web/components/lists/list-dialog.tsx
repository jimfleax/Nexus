"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeList } from "@nexus/shared";
import { useCreateList, useUpdateList, useDeleteList } from "@/hooks/use-lists";
import { useProjects } from "@/hooks/use-projects";
import { useControllableOpen } from "@/hooks/use-controllable-open";
import { projectUrl } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmitButton, CancelButton } from "@/components/ui/dialog-actions";
import { FormField, NativeSelect } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FolderPlus } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ListDialog({
  mode,
  list,
  projectId,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  mode: "create" | "edit";
  list?: KnowledgeList;
  projectId?: string; // initial project for create
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { open, setOpen } = useControllableOpen(openProp, onOpenChange);
  const router = useRouter();

  const [name, setName] = useState(list?.name ?? "");
  const [description, setDescription] = useState(list?.description ?? "");

  // Reset form when opening create dialog
  useEffect(() => {
    if (open && mode === "create") {
      setName("");
      setDescription("");
    } else if (open && mode === "edit" && list) {
      setName(list.name);
      setDescription(list.description ?? "");
    }
  }, [open, mode, list]);

  const { data: projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId ?? projects[0]?.id ?? "",
  );
  const activeProjectId = projectId || selectedProjectId;

  const { mutateAsync: createList, isPending: isCreating } = useCreateList();
  const { mutateAsync: updateList, isPending: isUpdating } = useUpdateList();
  const { mutateAsync: deleteList, isPending: isDeleting } = useDeleteList();

  const isPending = isCreating || isUpdating;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    if (mode === "create" && activeProjectId) {
      await createList({
        projectId: activeProjectId,
        input: { projectId: activeProjectId, name, description },
      });
      setOpen(false);
    } else if (mode === "edit" && list) {
      await updateList({
        projectId: list.projectId,
        listId: list.id,
        input: { name, description },
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined && trigger !== null ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : mode === "create" ? (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="gap-2 border-[#dec9e9] bg-white text-[#6247aa] hover:bg-[#dec9e9]"
            >
              <FolderPlus className="size-4 text-[#6247aa]" />
              <span>New List</span>
            </Button>
          }
        />
      ) : null}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create a list" : "Edit list"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Lists keep related resources together within a project collection."
                : "Update the details of this collection."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mode === "create" && !projectId && (
              <FormField label="Target Project" htmlFor="list-project" required>
                <NativeSelect
                  id="list-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}

            <FormField label="List Name" htmlFor="list-name" required>
              <Input
                id="list-name"
                autoFocus={mode === "create"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for this collection"
                required
              />
            </FormField>

            <FormField label="Description" htmlFor="list-desc">
              <Input
                id="list-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this collection hold?"
              />
            </FormField>
          </div>

          <DialogFooter
            className={
              mode === "edit"
                ? "flex items-center justify-between sm:justify-between w-full"
                : ""
            }
          >
            {mode === "edit" && list ? (
              <ConfirmDialog
                title="Delete List"
                description="Are you sure you want to delete this list and all its resources?"
                isLoading={isDeleting}
                onConfirm={async () => {
                  await deleteList({
                    projectId: list.projectId,
                    listId: list.id,
                  });
                  setOpen(false);
                  router.push(projectUrl(list.projectId));
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isDeleting || isPending}
                    className="text-[#a83232] hover:bg-red-50 hover:text-red-700"
                  >
                    Delete List
                  </Button>
                }
              />
            ) : mode === "create" ? (
              <CancelButton onCancel={() => setOpen(false)} />
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              {mode === "edit" && (
                <CancelButton
                  onCancel={() => setOpen(false)}
                  disabled={isDeleting || isPending}
                />
              )}
              <SubmitButton
                isPending={isPending}
                pendingText={mode === "create" ? "Creating..." : "Saving..."}
                disabled={
                  !name.trim() ||
                  (mode === "create" && !activeProjectId) ||
                  isDeleting
                }
              >
                {mode === "create" ? "Create List" : "Save Changes"}
              </SubmitButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateListDialog(props: {
  projectId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ListDialog mode="create" {...props} />;
}

export function EditListDialog(props: {
  list: KnowledgeList;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ListDialog mode="edit" trigger={props.children} {...props} />;
}
