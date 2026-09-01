/**
 * @file edit-resource-dialog.tsx
 * @description Modal for editing a resource's metadata, list placement, and content, or deleting it.
 * @architecture Client component; updates via useUpdateResource, deletes via useDeleteResource (native confirm) then navigates back to the list.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Resource, ResourceType } from "@nexus/shared";
import { useLists } from "@/hooks/use-lists";
import { useUpdateResource, useDeleteResource } from "@/hooks/use-resources";
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
 * @constant resourceTypes
 * @desc    Selectable resource types with display labels and hints
 */
const resourceTypes: {
  type: ResourceType;
  label: string;
  description: string;
}[] = [
  { type: "markdown", label: "Note", description: "Write directly in Nexus" },
  { type: "url", label: "Web Link", description: "Save a website for later" },
  {
    type: "pdf",
    label: "PDF Document",
    description: "Read a PDF in the viewer",
  },
  { type: "image", label: "Image", description: "Save an image reference" },
];

/**
 * @desc    Render an edit/delete dialog for the given resource
 * @param   {{resource: Resource; children: React.ReactNode}} props - The resource and trigger element
 * @returns {JSX.Element} The dialog
 */
export function EditResourceDialog({
  resource,
  children,
  isNativeButton = true,
  open: openProp,
  onOpenChange,
}: {
  resource: Resource;
  children?: React.ReactNode;
  isNativeButton?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = isControlled
    ? onOpenChange || (() => {})
    : setOpenState;
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description || "");
  const [type, setType] = useState<ResourceType>(resource.type);
  const [url, setUrl] = useState(resource.url || "");
  const [content, setContent] = useState(resource.content || "");
  const [tagsInput, setTagsInput] = useState(resource.tags?.join(", ") || "");

  const { data: availableLists = [] } = useLists(resource.projectId);
  const { mutateAsync: updateResource, isPending: isUpdating } =
    useUpdateResource();
  const { mutateAsync: deleteResource, isPending: isDeleting } =
    useDeleteResource();

  const router = useRouter();
  const [selectedListId, setSelectedListId] = useState(resource.listId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !selectedListId) return;

    const parsedTags = tagsInput
      .split(/[,#\s]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    await updateResource({
      resourceId: resource.id,
      input: {
        title: title.trim(),
        type,
        description: description.trim(),
        url: url.trim() || undefined,
        content: content.trim() || undefined,
        tags: parsedTags,
        listId: selectedListId,
      },
    });

    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this resource?")) {
      await deleteResource(resource.id);
      setOpen(false);
      router.push(`/projects/${resource.projectId}/lists/${resource.listId}`);
    }
  };

  const isUrlType = type === "url" || type === "pdf" || type === "image";
  const isContentType =
    type === "markdown" ||
    type === "note" ||
    type === "text" ||
    type === "chat" ||
    type === "ebook";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined ? (
        <DialogTrigger
          render={children as React.ReactElement}
          nativeButton={isNativeButton}
        />
      ) : null}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit resource</DialogTitle>
            <DialogDescription>
              Update the details of this resource.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-resource-list"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  Move to List <span className="text-[#a83232]">*</span>
                </label>
                <select
                  id="edit-resource-list"
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-[#6247aa] outline-none"
                  disabled={!availableLists.length}
                  required
                >
                  {availableLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-resource-type"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Resource Type
              </label>
              <select
                id="edit-resource-type"
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-[#6247aa] outline-none"
              >
                {resourceTypes.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label} — {item.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-resource-title"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Title <span className="text-[#a83232]">*</span>
              </label>
              <Input
                id="edit-resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title for this resource"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-resource-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Summary / Description
              </label>
              <Input
                id="edit-resource-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary or takeaways..."
              />
            </div>

            {isUrlType && (
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-resource-url"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  {type === "pdf"
                    ? "PDF Document URL"
                    : type === "image"
                      ? "Image URL"
                      : "Web Address (URL)"}
                </label>
                <Input
                  id="edit-resource-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a URL"
                />
              </div>
            )}

            {isContentType && (
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-resource-content"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  Content
                </label>
                <textarea
                  id="edit-resource-content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes or paste text here..."
                  className="w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-xs text-[#6247aa] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="edit-resource-tags"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Tags (comma or space separated)
              </label>
              <Input
                id="edit-resource-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tag1, tag2, tag3"
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
              {isDeleting ? "Deleting..." : "Delete Resource"}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isDeleting || isUpdating}
                className="border-[#dec9e9]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !title.trim() || !selectedListId || isDeleting || isUpdating
                }
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
