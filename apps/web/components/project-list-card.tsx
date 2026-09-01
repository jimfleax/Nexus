/**
 * @file project-list-card.tsx
 * @description Row for a knowledge list within a project showing its resource count, reorder controls, and a right-click context menu (Open/Rename/Edit/Info/Delete).
 * @architecture Client component; right-click opens a context menu. Rename via RenameDialog, Edit via EditListDialog, Delete via ConfirmDialog, reorder reported via onReorder. Dialogs render as siblings (not nested) so the menu never auto-focuses them.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KnowledgeList, Project } from "@nexus/shared";
import { useResources } from "@/hooks/use-resources";
import { useDeleteList, useUpdateList } from "@/hooks/use-lists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RenameDialog } from "@/components/ui/rename-dialog";
import { EditListDialog } from "@/components/lists/edit-list-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { InfoDialog } from "@/components/ui/info-dialog";

/**
 * @desc    Render a list row with count, reorder arrows, right-click context menu, and delete confirmation
 * @param   {Object} props - Project/list context, index, total, and reorder callback
 * @returns {JSX.Element} The list card
 */
export function ProjectListCard({
  project,
  list,
  index,
  total,
  onReorder,
}: {
  project: Project;
  list: KnowledgeList;
  index: number;
  total: number;
  onReorder: (index: number, direction: "up" | "down") => void;
}) {
  const { data: resources = [] } = useResources(project.id, list.id);
  const count = resources.length;
  const { mutate: deleteList } = useDeleteList();
  const { mutateAsync: updateList, isPending: isRenaming } = useUpdateList();
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const listHref = `/projects/${project.id}/lists/${list.id}`;

  const handleRename = async (name: string) => {
    await updateList({
      projectId: project.id,
      listId: list.id,
      input: { description: list.description ?? "", name },
    });
    setRenameOpen(false);
  };

  const handleDelete = () => {
    deleteList(
      { projectId: project.id, listId: list.id },
      { onSuccess: () => router.push(`/projects/${project.id}`) },
    );
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <div className="group flex items-center gap-2 rounded-xl border border-transparent p-2 transition-all duration-300 hover:border-[#dec9e9] hover:bg-white hover:shadow-sm">
              <Link href={listHref} className="flex flex-1 items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f8f4fb] text-[#6247aa] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#6247aa] group-hover:text-white group-hover:shadow-md">
                  ▱
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground transition-colors group-hover:text-[#6247aa]">
                    {list.name}
                  </h3>
                  <p className="text-sm text-[#6247aa]/80">{list.description}</p>
                </div>
                <span className="text-sm font-medium text-[#7251b5]/70 transition-colors group-hover:text-[#7251b5]">
                  {count} {count === 1 ? "resource" : "resources"}
                </span>
                <span className="mr-4 text-[#815ac0] transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  disabled={index === 0}
                  onClick={() => onReorder(index, "up")}
                  className="rounded p-1 text-[#6247aa] hover:bg-[#dec9e9] disabled:opacity-30"
                  title="Move Up"
                >
                  ▲
                </button>
                <button
                  disabled={index === total - 1}
                  onClick={() => onReorder(index, "down")}
                  className="rounded p-1 text-[#6247aa] hover:bg-[#dec9e9] disabled:opacity-30"
                  title="Move Down"
                >
                  ▼
                </button>
              </div>
            </div>
          }
        />
        <ContextMenuContent>
          <ContextMenuItem onClick={() => router.push(listHref)}>
            Open
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setRenameOpen(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setEditOpen(true)}>
            Edit
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setInfoOpen(true)}>Info</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        name={list.name}
        title="Rename collection"
        label="List Name"
        isPending={isRenaming}
        onSubmit={handleRename}
      />
      <EditListDialog
        list={list}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Collection"
        description="Are you sure you want to delete this collection?"
        onConfirm={handleDelete}
        confirmText="Delete"
      />
      <InfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        type="list"
        id={list.id}
      />
    </>
  );
}
