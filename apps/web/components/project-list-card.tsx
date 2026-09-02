"use client";

import { projectUrl, listUrl } from "@/lib/urls";
/**
 * @file project-list-card.tsx
 * @description Row for a knowledge list within a project showing its resource count, reorder controls, and a right-click context menu (Open/Rename/Edit/Info/Delete).
 * @architecture Client component; right-click opens a context menu. Rename via RenameDialog, Edit via EditListDialog, Delete via ConfirmDialog, reorder reported via onReorder. Dialogs render as siblings (not nested) so the menu never auto-focuses them.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KnowledgeList, Project } from "@nexus/shared";
import { useResources } from "@/hooks/use-resources";
import { useDeleteList, useUpdateList } from "@/hooks/use-lists";
import { EditListDialog } from "@/components/lists/list-dialog";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";

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
  const listHref = listUrl(project.id, list.id);

  const handleRename = async (name: string) => {
    await updateList({
      projectId: project.id,
      listId: list.id,
      input: { description: list.description ?? "", name },
    });
  };

  const handleDelete = () => {
    deleteList(
      { projectId: project.id, listId: list.id },
      { onSuccess: () => router.push(projectUrl(project.id)) },
    );
  };

  return (
    <>
      <EntityContextMenu
        entityKind="list"
        openHref={listHref}
        rename={{
          name: list.name,
          title: "Rename collection",
          label: "List Name",
          isPending: isRenaming,
          onSubmit: handleRename,
        }}
        editDialog={<EditListDialog list={list} />}
        deleteDialog={{
          title: "Delete Collection",
          description: "Are you sure you want to delete this collection?",
          onConfirm: handleDelete,
        }}
        info={{ id: list.id, type: "list" }}
      >
        <div
          className="group flex items-center gap-2 rounded-xl border border-transparent p-2 transition-all duration-300 hover:border-[#dec9e9] hover:bg-white hover:shadow-sm"
          data-boneyard="project-list-card"
        >
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
      </EntityContextMenu>
    </>
  );
}
