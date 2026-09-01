/**
 * @file create-project-dialog.tsx
 * @description Modal for creating a project with name, description, and a preset/typed icon.
 * @architecture Client component; supports controlled or self-managed open state, creates via useCreateProject, and navigates to the new project.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "@phosphor-icons/react";
import { useCreateProject } from "@/hooks/use-projects";
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
 * @constant PRESET_ICONS
 * @desc    Selectable symbol set for a project's icon
 */
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

/**
 * @desc    Render a create-project dialog with optional custom trigger or controlled state
 * @param   {Object} props - Compact style, custom trigger, and optional controlled open state
 * @returns {JSX.Element} The dialog
 */
export function CreateProjectDialog({
  compact = false,
  trigger,
  open,
  onOpenChange,
}: {
  compact?: boolean;
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
  const [icon, setIcon] = useState("◈");
  const { mutateAsync: createProject, isPending } = useCreateProject();
  const router = useRouter();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const project = await createProject({ name, description, icon });
    setDialogOpen(false);
    setName("");
    setDescription("");
    setIcon("◈");
    router.push(`/projects/${project.id}`);
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
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>
              Start a new knowledge context for a topic, area of work, or
              research thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="project-name"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Project Name <span className="text-[#a83232]">*</span>
              </label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for this project"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="project-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Description
              </label>
              <Input
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What belongs in this project?"
              />
            </div>

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
              disabled={!name.trim() || isPending}
              className="bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm"
            >
              {isPending && <Spinner className="mr-1.5 size-4" />}
              {isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
