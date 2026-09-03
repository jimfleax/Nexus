"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { InfoDialog } from "@/components/ui/info-dialog";
import { RenameDialog } from "@/components/ui/rename-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FolderOpen,
  PencilSimple,
  Trash,
  Info,
  TextAa,
  Link as LinkIcon,
  ArrowSquareOut,
} from "@phosphor-icons/react";

export function EntityContextMenu({
  children,
  entityKind,
  openHref,
  onOpen,
  onRename,
  onEdit,
  onDelete,
  onInfo,
  rename,
  deleteDialog,
  info,
  editDialog,
}: {
  children: React.ReactNode;
  entityKind: "project" | "list" | "resource";
  openHref?: string;
  onOpen?: () => void;
  onRename?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onInfo?: () => void;
  rename?: {
    name: string;
    title?: string;
    label?: string;
    isPending?: boolean;
    onSubmit: (name: string) => void;
  };
  deleteDialog?: {
    title: string;
    description: string;
    onConfirm: () => void;
    isPending?: boolean;
  };
  info?: {
    id: string;
    type?: string;
  };
  editDialog?: React.ReactNode;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else {
      setDeleteOpen(true);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48 border-[#dec9e9] bg-white text-[#6247aa] shadow-lg shadow-[#dac3e8]/20">
          {(openHref || onOpen) && (
            <ContextMenuItem>
              {openHref ? (
                <Link
                  href={openHref}
                  className="flex cursor-pointer items-center gap-2 font-medium focus:bg-[#f8f4fb]"
                >
                  <FolderOpen className="size-4" /> Open {entityKind}
                </Link>
              ) : (
                <div
                  onClick={onOpen}
                  className="flex cursor-pointer items-center gap-2 font-medium focus:bg-[#f8f4fb]"
                >
                  <FolderOpen className="size-4" /> Open {entityKind}
                </div>
              )}
            </ContextMenuItem>
          )}

          {openHref && entityKind === "resource" && (
            <ContextMenuItem>
              <Link
                href={openHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center gap-2 focus:bg-[#f8f4fb]"
              >
                <ArrowSquareOut className="size-4" /> Open in new tab
              </Link>
            </ContextMenuItem>
          )}

          <ContextMenuSeparator className="bg-[#dec9e9]" />

          {rename && (
            <ContextMenuItem
              onSelect={() => setRenameOpen(true)}
              className="flex cursor-pointer items-center gap-2 focus:bg-[#f8f4fb]"
            >
              <TextAa className="size-4" /> Rename {entityKind}
            </ContextMenuItem>
          )}

          {onEdit && (
            <ContextMenuItem
              onSelect={onEdit}
              className="flex cursor-pointer items-center gap-2 focus:bg-[#f8f4fb]"
            >
              <PencilSimple className="size-4" /> Edit {entityKind}
            </ContextMenuItem>
          )}

          {editDialog && (
            <ContextMenuItem
              onSelect={() => setEditOpen(true)}
              className="flex cursor-pointer items-center gap-2 focus:bg-[#f8f4fb]"
            >
              <PencilSimple className="size-4" /> Edit {entityKind}
            </ContextMenuItem>
          )}

          <ContextMenuSeparator className="bg-[#dec9e9]" />

          {info && (
            <ContextMenuItem
              onSelect={() => setInfoOpen(true)}
              className="flex cursor-pointer items-center gap-2 focus:bg-[#f8f4fb]"
            >
              <Info className="size-4" />{" "}
              {entityKind === "project"
                ? "Project"
                : entityKind === "list"
                  ? "List"
                  : "Resource"}{" "}
              info
            </ContextMenuItem>
          )}

          <ContextMenuSeparator className="bg-[#dec9e9]" />

          {(deleteDialog || onDelete) && (
            <ContextMenuItem
              onSelect={handleDelete}
              className="flex cursor-pointer items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <Trash className="size-4" /> Delete {entityKind}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {rename && (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          name={rename.name}
          title={rename.title}
          label={rename.label}
          isPending={rename.isPending}
          onSubmit={rename.onSubmit}
        />
      )}

      {editDialog &&
        React.isValidElement(editDialog) &&
        React.cloneElement(editDialog as React.ReactElement<any>, {
          open: editOpen,
          onOpenChange: setEditOpen,
        })}

      {deleteDialog && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={deleteDialog.title}
          description={deleteDialog.description}
          onConfirm={deleteDialog.onConfirm}
          isLoading={deleteDialog.isPending}
        />
      )}

      {info && (
        <InfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          id={info.id}
          type={(info.type || entityKind) as "project" | "list" | "resource"}
        />
      )}
    </>
  );
}
