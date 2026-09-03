/**
 * @file resource-dialog.tsx
 * @description Dialog component for creating or editing resources.
 * @architecture Handles complex multi-modal form logic (file uploads, rich text, links) for Resource entities.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Resource, ResourceType } from "@nexus/shared";
import { useProjects } from "@/hooks/use-projects";
import { useLists } from "@/hooks/use-lists";
import {
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from "@/hooks/use-resources";
import { useControllableOpen } from "@/hooks/use-controllable-open";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmitButton, CancelButton } from "@/components/ui/dialog-actions";
import { FormField, NativeSelect } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FilePicker } from "@/components/ui/file-picker";
import { Plus } from "@phosphor-icons/react";
import { listUrl } from "@/lib/urls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { parseTags, formatFilenameToTitle } from "@/lib/utils";
import {
  RESOURCE_TYPES,
  isContentType as checkContentType,
  isUrlType as checkUrlType,
} from "@/lib/resource-meta";

/**
 * @desc Modal form to create or edit a resource
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function ResourceDialog({
  mode,
  resource,
  projectId: initialProjectId,
  listId: initialListId,
  trigger,
  open: openProp,
  onOpenChange,
  isNativeButton = true,
}: {
  mode: "create" | "edit";
  resource?: Resource;
  projectId?: string;
  listId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isNativeButton?: boolean;
}) {
  const { open, setOpen } = useControllableOpen(openProp, onOpenChange);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>("markdown");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Lists/Projects State
  const { data: projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const activeProjectId = initialProjectId || selectedProjectId;

  const { data: availableLists = [] } = useLists(
    activeProjectId || resource?.projectId,
  );
  const [selectedListId, setSelectedListId] = useState("");
  const activeListId = initialListId || selectedListId;

  // Initialize Form
  useEffect(() => {
    if (open && mode === "create") {
      setTitle("");
      setDescription("");
      setType("markdown");
      setUrl("");
      setContent("");
      setTagsInput("");
      setFile(null);
      if (!initialProjectId && projects.length > 0)
        setSelectedProjectId(projects[0].id);
      if (!initialListId && availableLists.length > 0)
        setSelectedListId(availableLists[0].id);
    } else if (open && mode === "edit" && resource) {
      setTitle(resource.title);
      setDescription(resource.description || "");
      setType(resource.type);
      setUrl(resource.url || "");
      setContent(resource.content || "");
      setTagsInput(resource.tags?.join(", ") || "");
      setSelectedListId(resource.listId);
    }
  }, [
    open,
    mode,
    resource,
    projects,
    availableLists,
    initialProjectId,
    initialListId,
  ]);

  // Mutations
  const {
    mutateAsync: createResource,
    isPending: isCreating,
    error: createError,
  } = useCreateResource();
  const { mutateAsync: updateResource, isPending: isUpdating } =
    useUpdateResource();
  const { mutateAsync: deleteResource, isPending: isDeleting } =
    useDeleteResource();

  const isPending = isCreating || isUpdating;

  const displayError =
    mode === "create" && createError
      ? (createError as { response?: { data?: { error?: string } } }).response
          ?.data?.error ||
        createError.message ||
        "Failed to create resource"
      : null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    try {
      const parsedTags = parseTags(tagsInput);

      if (mode === "create" && activeProjectId && activeListId) {
        await createResource({
          projectId: activeProjectId,
          listId: activeListId,
          input: {
            projectId: activeProjectId,
            listId: activeListId,
            isFavorite: false,
            title: title.trim(),
            type,
            description: description.trim(),
            url: url.trim() || undefined,
            content: content.trim() || undefined,
            tags: parsedTags,
            mimeType: file ? file.type : undefined,
            file: file || undefined,
          },
        });
      } else if (mode === "edit" && resource) {
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
      }

      setOpen(false);
    } catch (err) {
      console.error(`Failed to ${mode} resource`, err);
    }
  };

  const isUrlMode = checkUrlType(type) || type === "pdf" || type === "image";
  const isContentMode =
    checkContentType(type) ||
    type === "note" ||
    type === "text" ||
    type === "chat" ||
    type === "ebook";
  const isUploadMode =
    (type === "pdf" || type === "image") && mode === "create";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger === null ? null : (
          <DialogTrigger
            render={trigger as React.ReactElement}
            nativeButton={isNativeButton}
          />
        )
      ) : mode === "create" ? (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="gap-2 border-[#dec9e9] bg-[#f8f4fb] text-[#6247aa] hover:bg-[#dec9e9]"
            >
              <Plus className="size-4" weight="bold" />
              <span>New Resource</span>
            </Button>
          }
        />
      ) : null}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add to knowledge base" : "Edit resource"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Add a new resource to this project's collection."
                : "Update the details of this resource."}
            </DialogDescription>
          </DialogHeader>

          {displayError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {displayError}
            </div>
          )}

          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-2 gap-3">
              {mode === "create" && !initialProjectId && (
                <FormField
                  label="Target Project"
                  htmlFor="resource-project"
                  required
                >
                  <NativeSelect
                    id="resource-project"
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

              {mode === "create" && !initialListId && (
                <FormField label="Target List" htmlFor="resource-list" required>
                  <NativeSelect
                    id="resource-list"
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    disabled={!availableLists.length}
                    required
                  >
                    {availableLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              )}

              {mode === "edit" && resource && (
                <FormField
                  label="Move to List"
                  htmlFor="edit-resource-list"
                  required
                >
                  <NativeSelect
                    id="edit-resource-list"
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    disabled={!availableLists.length}
                    required
                  >
                    {availableLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              )}

              <FormField label="Resource Type" htmlFor="resource-type">
                <NativeSelect
                  id="resource-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ResourceType)}
                >
                  {RESOURCE_TYPES.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label} — {item.description}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>

            {isUploadMode && (
              <FormField label="Upload File" htmlFor="resource-file">
                <FilePicker
                  accept={type === "pdf" ? ".pdf" : "image/*"}
                  maxSizeMb={5}
                  value={file}
                  onChange={(newFile) => {
                    setFile(newFile);
                    if (newFile && !title)
                      setTitle(formatFilenameToTitle(newFile.name));
                  }}
                  compact
                />
              </FormField>
            )}

            <FormField label="Title" htmlFor="resource-title" required>
              <Input
                id="resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title for this resource"
                required
              />
            </FormField>

            <FormField label="Summary / Description" htmlFor="resource-desc">
              <Input
                id="resource-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary or takeaways..."
              />
            </FormField>

            {isUrlMode && (
              <FormField
                label={
                  type === "pdf"
                    ? "PDF Document URL"
                    : type === "image"
                      ? "Image URL"
                      : "Web Address (URL)"
                }
                htmlFor="resource-url"
              >
                <Input
                  id="resource-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a URL"
                  disabled={!!file}
                />
              </FormField>
            )}

            {isContentMode && (
              <FormField label="Content" htmlFor="resource-content">
                <textarea
                  id="resource-content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes or paste text here..."
                  className="w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-xs text-[#6247aa] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </FormField>
            )}

            <FormField
              label="Tags (comma or space separated)"
              htmlFor="resource-tags"
            >
              <Input
                id="resource-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tag1, tag2, tag3"
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
            {mode === "edit" && resource ? (
              <ConfirmDialog
                title="Delete Resource"
                description="Are you sure you want to delete this resource?"
                isLoading={isDeleting}
                onConfirm={async () => {
                  await deleteResource(resource.id);
                  setOpen(false);
                  router.push(listUrl(resource.projectId, resource.listId));
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isDeleting || isPending}
                    className="text-[#a83232] hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Resource
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
                  !title.trim() ||
                  (mode === "create" && (!activeProjectId || !activeListId)) ||
                  isDeleting
                }
              >
                {mode === "create" ? "Create Resource" : "Save Changes"}
              </SubmitButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * @desc Helper component to quickly instantiate the ResourceDialog in create mode
 */
export function CreateResourceDialog(props: {
  projectId?: string;
  listId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ResourceDialog mode="create" {...props} />;
}

/**
 * @desc Helper component to quickly instantiate the ResourceDialog in edit mode
 */
export function EditResourceDialog(props: {
  resource: Resource;
  children?: React.ReactNode;
  isNativeButton?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return <ResourceDialog mode="edit" trigger={props.children} {...props} />;
}
