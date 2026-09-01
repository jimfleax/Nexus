/**
 * @file index.ts
 * @description Barrel entry for the shared Nexus package, exporting domain types and Zod validation schemas.
 * @architecture Re-exports all schema modules and defines the core domain types (Project, KnowledgeList, Resource) consumed by both backend and frontend.
 */

/**
 * @typedef {"markdown"|"pdf"|"image"|"ebook"|"text"|"url"|"note"|"chat"} ResourceType
 * @description Discriminator for how a resource is stored and rendered.
 */
export type ResourceType =
  "markdown" | "pdf" | "image" | "ebook" | "text" | "url" | "note" | "chat";

/**
 * @typedef {Object} Project
 * @description Domain shape of a project as shared across app and API.
 */
export type Project = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

/**
 * @typedef {Object} KnowledgeList
 * @description Domain shape of a knowledge list as shared across app and API.
 */
export type KnowledgeList = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  position: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

/**
 * @typedef {Object} Resource
 * @description Domain shape of a resource as shared across app and API.
 */
export type Resource = {
  id: string;
  projectId: string;
  listId: string;
  title: string;
  type: ResourceType;
  mimeType?: string;
  description?: string;
  content?: string;
  url?: string;
  tags: string[];
  isFavorite: boolean;
  status?: string;
  driveFileId?: string;
  uploadUri?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  readingTime?: string;
  lastOpenedAt?: string | Date;
};

export * from "./schemas/project.js";
export * from "./schemas/knowledge-list.js";
export * from "./schemas/resource.js";
export * from "./schemas/user.js";
export * from "./schemas/info.js";
