/**
 * @file resource-card.tsx
 * @description List row for a resource with type icon, metadata, favorite toggle, and a right-click context menu (Open/Rename/Edit/Info/Delete).
 * @architecture Client component used across recent/favorites/dashboard lists; animated with Framer Motion on scroll into view. Dialogs render as siblings (not nested) so the menu never auto-focuses them.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  FileMd,
  FileText,
  Image,
  Link as LinkIcon,
  ChatText,
  Notebook,
} from "@phosphor-icons/react";
import type { Resource } from "@nexus/shared";
import { useDeleteResource, useUpdateResource } from "@/hooks/use-resources";
import { EditResourceDialog } from "@/components/resources/edit-resource-dialog";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";
import { formatDate } from "@/lib/utils";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { TagChips } from "@/components/ui/tag-chips";

/**
 * @constant icons
 * @desc    Resource type to phosphor icon mapping
 */
const icons: Record<Resource["type"], React.ElementType> = {
  markdown: FileMd,
  pdf: FileText,
  image: Image,
  ebook: FileText,
  text: FileText,
  url: LinkIcon,
  note: Notebook,
  chat: ChatText,
};

/**
 * @desc    Render a resource row with favorite toggle, context menu, and delete confirmation
 * @param   {{resource: Resource; index?: number}} props - Resource and scroll-animation index
 * @returns {JSX.Element} The resource card
 */
export function ResourceCard({
  resource,
  index = 0,
}: {
  resource: Resource;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { mutate: deleteResource } = useDeleteResource();
  const { mutateAsync: updateResource, isPending: isRenaming } =
    useUpdateResource();
  const Icon = icons[resource.type];
  const href = `/projects/${resource.projectId}/lists/${resource.listId}/resources/${resource.id}`;

  const handleRename = async (title: string) => {
    await updateResource({
      resourceId: resource.id,
      input: { title },
    });
    setRenameOpen(false);
  };

  const handleDelete = () => {
    deleteResource(resource.id, {
      onSuccess: () =>
        router.push(`/projects/${resource.projectId}/lists/${resource.listId}`),
    });
  };

  return (
    <>
      <EntityContextMenu
        entityKind="resource"
        openHref={href}
        rename={{
          name: resource.title,
          title: "Rename resource",
          label: "Title",
          isPending: isRenaming,
          onSubmit: handleRename,
        }}
        editDialog={<EditResourceDialog resource={resource} />}
        deleteDialog={{
          title: "Delete Resource",
          description: "Are you sure you want to delete this resource?",
          onConfirm: handleDelete,
        }}
        info={{ id: resource.id, type: "resource" }}
      >
        <motion.article
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.28,
            delay: Math.min(index * 0.035, 0.18),
            ease: "easeOut",
          }}
          whileHover={reduceMotion ? undefined : { x: 3 }}
          className="group flex gap-3 border-b border-[#dec9e9] py-4 last:border-b-0"
        >
          <Link
            href={href}
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#dec9e9] text-[#6247aa] transition-colors group-hover:bg-[#dec9e9]"
            aria-label={`Open ${resource.title}`}
          >
            <Icon className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={href}
              className="font-medium text-[#6247aa] transition-colors hover:text-[#6247aa]"
            >
              {resource.title}
            </Link>
            <p className="mt-1 truncate text-sm text-[#6247aa]">
              {resource.description}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6247aa]">
              <span className="capitalize">{resource.type}</span>
              {resource.readingTime && (
                <>
                  <span>·</span>
                  <span>{resource.readingTime}</span>
                </>
              )}
              <TagChips tags={resource.tags} />
              <span className="ml-auto">
                Modified {formatDate(resource.updatedAt)}
              </span>
            </div>
          </div>
          <FavoriteButton resourceId={resource.id} variant="icon" />
        </motion.article>
      </EntityContextMenu>
    </>
  );
}
