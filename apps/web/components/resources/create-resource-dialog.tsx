/**
 * @file create-resource-dialog.tsx
 * @description Modal for adding resources: URL, uploaded file (PDF/image), or typed content (markdown/chat/text), within a project/list.
 * @architecture Client component; creates the resource via useCreateResource, PUTs the file to the backend-received upload URI, and finalizes with completeUpload.
 */
"use client";

import { useState, useEffect } from "react";
import { Plus } from "@phosphor-icons/react";
import type { ResourceType } from "@nexus/shared";
import { useProjects } from "@/hooks/use-projects";
import { useLists } from "@/hooks/use-lists";
import { useCreateResource } from "@/hooks/use-resources";
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
import { FilePicker } from "@/components/ui/file-picker";
import { formatFilenameToTitle } from "@/lib/utils";

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
 * @desc    Render a create-resource dialog with type-specific inputs and file upload orchestration
 * @param   {Object} props - Optional project/list defaults, trigger, and controlled open state
 * @returns {JSX.Element} The dialog
 */
export function CreateResourceDialog({
  projectId: initialProjectId,
  listId: initialListId,
  trigger,
  open,
  onOpenChange,
}: {
  projectId?: string;
  listId?: string;
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ResourceType>("markdown");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialProjectId ?? projects[0]?.id ?? "",
  );
  const activeProjectId = initialProjectId || selectedProjectId;

  const { data: availableLists = [] } = useLists(activeProjectId);
  const [selectedListId, setSelectedListId] = useState(initialListId ?? "");
  const activeListId = initialListId || selectedListId;

  const {
    mutateAsync: createResource,
    isPending: isUploading,
    error: createError,
  } = useCreateResource();

  const displayError = createError
    ? (createError as { response?: { data?: { error?: string } } }).response
        ?.data?.error ||
      createError.message ||
      "Failed to create resource"
    : null;

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId && !initialProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, initialProjectId]);

  useEffect(() => {
    if (!initialListId && availableLists.length > 0) {
      if (!availableLists.find((l) => l.id === selectedListId)) {
        setSelectedListId(availableLists[0].id);
      }
    }
  }, [availableLists, initialListId, selectedListId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !activeProjectId || !activeListId) return;

    try {
      const parsedTags = tagsInput
        .split(/[,#\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

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

      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setType("markdown");
      setUrl("");
      setContent("");
      setTagsInput("");
      setFile(null);
    } catch (err) {
      console.error("Failed to create resource", err);
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
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== null && (
        <DialogTrigger
          render={
            trigger ? (
              (trigger as React.ReactElement)
            ) : (
              <Button
                size="lg"
                className="gap-2 bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm"
              >
                <Plus className="size-4" weight="bold" />
                <span>New Resource</span>
              </Button>
            )
          }
        />
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
            <DialogDescription>
              Save a link, upload a document, or write a note.
            </DialogDescription>
          </DialogHeader>

          {displayError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {displayError}
            </div>
          )}

          <div className="space-y-3.5 py-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!initialProjectId && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="resource-project"
                    className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                  >
                    Target Project <span className="text-[#a83232]">*</span>
                  </label>
                  <select
                    id="resource-project"
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

              {!initialListId && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="resource-list"
                    className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                  >
                    List Collection <span className="text-[#a83232]">*</span>
                  </label>
                  <select
                    id="resource-list"
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-[#6247aa] outline-none"
                    disabled={!availableLists.length}
                    required
                  >
                    {availableLists.length ? (
                      availableLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No lists in project</option>
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="resource-type"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Resource Type
              </label>
              <select
                id="resource-type"
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
                htmlFor="resource-title"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Title <span className="text-[#a83232]">*</span>
              </label>
              <Input
                id="resource-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title for this resource"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="resource-desc"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Summary / Description
              </label>
              <Input
                id="resource-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary or takeaways..."
              />
            </div>

            {isUrlType && (
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-url"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  {type === "pdf"
                    ? "PDF Document URL or File"
                    : type === "image"
                      ? "Image URL or File"
                      : "Web Address (URL)"}
                </label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="resource-url"
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (e.target.value) setFile(null);
                    }}
                    placeholder="Paste a URL"
                    disabled={!!file}
                  />
                  {(type === "pdf" || type === "image") && (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-[#dec9e9] flex-1" />
                        <span className="text-xs font-medium uppercase text-[#6247aa]/70">
                          Or Upload File
                        </span>
                        <div className="h-px bg-[#dec9e9] flex-1" />
                      </div>
                      <FilePicker
                        file={file}
                        onFileSelect={(f) => {
                          if (f) {
                            setFile(f);
                            setUrl("");
                            if (!title) setTitle(formatFilenameToTitle(f.name));
                          } else {
                            setFile(null);
                          }
                        }}
                        accept={type === "pdf" ? "application/pdf" : "image/*"}
                        disabled={!!url}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {isContentType && (
              <div className="space-y-1.5">
                <label
                  htmlFor="resource-content"
                  className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
                >
                  {type === "chat"
                    ? "Chat Transcript (JSON or 'User: ... Assistant: ...')"
                    : type === "markdown"
                      ? "Markdown Body (Type or Upload a file)"
                      : "Notes / Content"}
                </label>

                {type === "markdown" && (
                  <div className="mb-4">
                    <FilePicker
                      file={file}
                      onFileSelect={async (f) => {
                        if (f) {
                          if (!title) setTitle(formatFilenameToTitle(f.name));
                          const text = await f.text();
                          setContent(text);
                          setFile(null); // Do not upload physical markdown file
                        } else {
                          setFile(null);
                          setContent("");
                        }
                      }}
                      accept=".md,text/markdown"
                      disabled={!!content}
                    />
                    <div className="my-3 flex items-center gap-2">
                      <div className="h-px bg-[#dec9e9] flex-1" />
                      <span className="text-xs font-medium uppercase text-[#6247aa]/70">
                        Or Type Content
                      </span>
                      <div className="h-px bg-[#dec9e9] flex-1" />
                    </div>
                  </div>
                )}

                <textarea
                  id="resource-content"
                  rows={4}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (e.target.value) setFile(null);
                  }}
                  placeholder={
                    type === "chat"
                      ? "User: How does consensus work?\nAssistant: Consensus algorithms allow nodes to agree on a shared state."
                      : "Write your notes or paste text here..."
                  }
                  className="w-full rounded-lg border border-input bg-transparent p-2.5 font-mono text-xs text-[#6247aa] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  disabled={!!file}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="resource-tags"
                className="text-xs font-semibold uppercase tracking-wider text-[#6247aa]"
              >
                Tags (comma or space separated)
              </label>
              <Input
                id="resource-tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tag1, tag2, tag3"
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
              disabled={
                !title.trim() ||
                !activeProjectId ||
                !activeListId ||
                isUploading
              }
              className="bg-[linear-gradient(40deg,#6247aa,#4a3285)] text-white hover:opacity-90 shadow-sm"
            >
              {isUploading && <Spinner className="mr-1.5 size-4" />}
              {isUploading ? "Uploading..." : "Create Resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
