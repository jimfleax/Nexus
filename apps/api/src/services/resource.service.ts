/**
 * @file resource.service.ts
 * @description Business logic for resource operations, extracted from route handlers.
 * @architecture Pure Mongoose operations. No HTTP/Fastify coupling.
 *              Handles uniqueness checks, list membership validation, and content retrieval.
 */

import { ResourceModel } from "../models/Resource.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { updateById } from "./db-utils.js";

/** Build a resource query with a default omission of heavy content and optional sort/limit/select. */
export function queryResources(
  filter: Record<string, unknown>,
  opts: { sort?: Record<string, 1 | -1>; limit?: number; select?: string } = {},
) {
  let query = ResourceModel.find(filter).select(opts.select ?? "-content");
  if (opts.sort) query = query.sort(opts.sort as any);
  if (opts.limit !== undefined) query = query.limit(opts.limit);
  return query;
}

/**
 * @desc    List resources in a project, optionally filtered by list, omitting heavy content
 * @param   {string} projectId - The project to scope to
 * @param   {string} [listId] - Optional list filter
 * @returns {Promise<Array>} Resources sorted newest first
 */
export async function listResourcesByProject(
  projectId: string,
  listId?: string,
) {
  const filter: Record<string, unknown> = { projectId };
  if (listId) {
    filter.listId = listId;
  }
  return queryResources(filter, { sort: { createdAt: -1 } });
}

/**
 * @desc    Find a resource by ID
 * @param   {string} id - The resource ID
 * @returns {Promise<any|null>} The resource document, or null
 */
export async function findResourceById(id: string) {
  return ResourceModel.findById(id);
}

/**
 * @desc    Find a resource by ID, selecting only content and type fields
 * @param   {string} id - The resource ID
 * @returns {Promise<any|null>} The resource with content, or null
 */
export async function findResourceContent(id: string) {
  return ResourceModel.findById(id).select("content type");
}

/**
 * @desc    Check if a resource with the same title already exists in a project for a given owner
 * @param   {string} projectId - The project scope
 * @param   {string} title - The resource title to check
 * @param   {string} ownerId - The owner to check against
 * @param   {string} [excludeId] - Optional resource ID to exclude (for updates)
 * @returns {Promise<boolean>} True if a duplicate exists
 */
export async function isDuplicateTitle(
  projectId: string,
  title: string,
  ownerId: string,
  excludeId?: string,
) {
  const filter: Record<string, unknown> = {
    projectId,
    title,
    ownerId,
  };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  const existing = await ResourceModel.findOne(filter);
  return !!existing;
}

/**
 * @desc    Validate that a list exists and belongs to the specified project
 * @param   {string} listId - The list ID
 * @param   {string} projectId - The project ID to validate against
 * @returns {Promise<any|null>} The list document if valid, or null
 */
export async function validateListMembership(
  listId: string,
  projectId: string,
) {
  return KnowledgeListModel.findOne({ _id: listId, projectId });
}

/**
 * @desc    Validate that a list exists (without project constraint) and return it
 * @param   {string} listId - The list ID
 * @returns {Promise<any|null>} The list document if found, or null
 */
export async function findListById(listId: string) {
  return KnowledgeListModel.findById(listId);
}

/**
 * @desc    Create and save a new resource document
 * @param   {object} data - The resource data
 * @returns {Promise<any>} The saved resource
 */
export async function createResource(data: {
  projectId: string;
  listId: string;
  title: string;
  type: string;
  mimeType?: string;
  description?: string;
  content?: string;
  url?: string;
  tags?: string[];
  isFavorite?: boolean;
  status?: string;
  driveFileId?: string;
  size?: number;
}) {
  const resource = new ResourceModel({
    ...data,
    status: data.status ?? "ready",
  });
  await resource.save();
  return resource;
}

/**
 * @desc    Update a resource by ID with the provided fields
 * @param   {string} id - The resource ID
 * @param   {Record<string, unknown>} updates - Fields to update
 * @returns {Promise<any|null>} The updated resource, or null
 */
export async function updateResource(
  id: string,
  updates: Record<string, unknown>,
) {
  return updateById(ResourceModel, id, updates);
}

/**
 * @desc    Toggle the isFavorite flag of a resource atomically
 * @param   {string} id - The resource ID
 * @returns {Promise<any|null>} The updated resource, or null
 */
export async function toggleFavoriteResource(id: string) {
  return ResourceModel.findByIdAndUpdate(
    id,
    [{ $set: { isFavorite: { $not: "$isFavorite" } } }],
    { returnDocument: "after", updatePipeline: true } as any,
  );
}
