import {
  FileMd,
  FileText,
  Image,
  Link as LinkIcon,
  ChatText,
  Notebook,
} from "@phosphor-icons/react";
import type { ResourceType } from "@nexus/shared";

export const RESOURCE_TYPES: {
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

export const RESOURCE_ICONS: Record<ResourceType, React.ElementType> = {
  markdown: FileMd,
  pdf: FileText,
  image: Image,
  ebook: FileText,
  text: FileText,
  url: LinkIcon,
  note: Notebook,
  chat: ChatText,
};

export const RESOURCE_LABELS: Record<string, string> = {
  markdown: "Markdown",
  pdf: "PDF",
  image: "Image",
  ebook: "E-book",
  text: "Text",
};

export const RESOURCE_COLORS: Record<string, string> = {
  markdown: "bg-[#9163cb]",
  pdf: "bg-[#6247aa]",
  image: "bg-[#815ac0]",
  ebook: "bg-[#a06cd5]",
  text: "bg-[#dec9e9]",
};

export function isUrlType(type: ResourceType): boolean {
  return type === "url";
}

export function isContentType(type: ResourceType): boolean {
  return type === "markdown" || type === "text" || type === "note";
}

export function capitalizeType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
