"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "@phosphor-icons/react";
import type { Project } from "@nexus/shared";
import {
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/use-projects";
import { useControllableOpen } from "@/hooks/use-controllable-open";
import { projectUrl } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmitButton, CancelButton } from "@/components/ui/dialog-actions";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PRESET_ICONS = [
  "◈",
  "✦",
  "⌘",
  "◉",
  "⬡",
  "❖",
  "▱",
  "⌬",
  "★",
  "☀",
  "☁",
  "☂",
  "⚑",
  "✈",
  "✉",
  "✏",
  "✓",
  "💻",
  "📚",
  "🔬",
  "📈",
  "🎨",
  "🧠",
  "⚙️",
  "🌐",
];

export function ProjectDialog({
  mode,
  project,
  compact = false,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  mode: "create" | "edit";
  project?: Project;
  compact?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { open, setOpen } = useControllableOpen(openProp, onOpenChange);
  const router = useRouter();

  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [icon, setIcon] = useState(project?.icon ?? "◈");

  useEffect(() => {
    if (open && mode === "create") {
      setName("");
      setDescription("");
      setIcon("◈");
    } else if (open && mode === "edit" && project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setIcon(project.icon ?? "◈");
    }
  }, [open, mode, project]);

  const { mutateAsync: createProject, isPending: isCreating } =
    useCreateProject();
  const { mutateAsync: updateProject, isPending: isUpdating } =
    useUpdateProject();
  const { mutateAsync: deleteProject, isPending: isDeleting } =
    useDeleteProject();

  const isPending = isCreating || isUpdating;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    if (mode === "create") {
      const created = await createProject({ name, description, icon });
      setOpen(false);
      router.push(projectUrl(created.id));
    } else if (mode === "edit" && project) {
      await updateProject({
        projectId: project.id,
        input: { name, description, icon },
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger === null ? null : (
          <DialogTrigger render={trigger as React.ReactElement} />
        )
      ) : mode === "create" ? (
        <DialogTrigger
          render={
            <Button
              variant={compact ? "outline" : "default"}
              className={
                compact
                  ? "w-full justify-start border-[#dec9e9] bg-white text-[#6247aa] hover:bg-[#dec9e9]"
                  : "gap-2"
              }
            >
              <FolderPlus className="size-4" />
              <span>New Project</span>
            </Button>
          }
        />
      ) : null}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create a project" : "Edit project"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Start a new knowledge context for a topic, area of work, or research thread."
                : "Update the details of this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <FormField label="Project Name" htmlFor="project-name" required>
              <Input
                id="project-name"
                autoFocus={mode === "create"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for this project"
                required
              />
            </FormField>

            <FormField label="Description" htmlFor="project-desc">
              <Input
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What belongs in this project?"
              />
            </FormField>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]">
                Icon Symbol
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_ICONS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setIcon(sym)}
                    className={`grid size-8 place-items-center rounded-md border text-sm transition-colors ${
                      icon === sym
                        ? "border-[#6247aa] bg-[#dec9e9] text-[#6247aa] font-bold ring-1 ring-[#6247aa]"
                        : "border-[#dec9e9] bg-white text-[#6247aa] hover:bg-[#f8f4fb]"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                  className="h-8 w-14 text-center font-mono text-sm"
                  maxLength={2}
                  title="Custom Icon"
                />
              </div>
            </div>
          </div>

          <DialogFooter
            className={
              mode === "edit"
                ? "flex items-center justify-between sm:justify-between w-full"
                : ""
            }
          >
            {mode === "edit" && project ? (
              <ConfirmDialog
                title="Delete Project"
                description="Are you sure you want to delete this project? This will permanently delete all lists and resources within it."
                isLoading={isDeleting}
                onConfirm={async () => {
                  await deleteProject(project.id);
                  setOpen(false);
                  router.push("/projects");
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isDeleting || isPending}
                    className="text-[#a83232] hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Project
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
                disabled={!name.trim() || isDeleting}
              >
                {mode === "create" ? "Create Project" : "Save Changes"}
              </SubmitButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateProjectDialog(props: {
  compact?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ProjectDialog mode="create" {...props} />;
}

export function EditProjectDialog(props: {
  project: Project;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ProjectDialog mode="edit" {...props} />;
}
