/**
 * @file resource.service.ts
 * @description Business logic for resource operations, extracted from route handlers.
 * @architecture Pure Mongoose operations. No HTTP/Fastify coupling.
 *              Handles uniqueness checks, list membership validation, and content retrieval.
 */

import { ResourceModel } from "../models/Resource.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { updateById } from "./db-utils.js";
import { IStorageAdapter } from "../utils/storage/types.js";

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
 * @desc    Find resource content by ID
 * @param   {string} id - The resource ID
 * @returns {Promise<any|null>} The resource content
 */
export async function findResourceContent(id: string) {
  return ResourceModel.findById(id).select("content type -_id");
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
  tags?: string[];
  isFavorite?: boolean;
  status?: string;
  driveFileId?: string;
  size?: number;
  content?: string;
  url?: string;
}) {
  const resource = new ResourceModel({
    ...data,
    status: data.status ?? "ready",
  });
  await resource.save();
  return resource;
}

export async function createResourceWithUpload(
  ownerId: string,
  body: any,
  storageAdapter: IStorageAdapter,
  fileStream?: NodeJS.ReadableStream,
  mimeType?: string,
) {
  // 1. Validate list membership
  const list = await validateListMembership(body.listId, body.projectId);
  if (!list) {
    throw new Error("Knowledge List not found in the specified project");
  }

  // 2. Check title uniqueness
  const exists = await isDuplicateTitle(body.projectId, body.title, ownerId);
  if (exists) {
    throw new Error("A resource with this name already exists in the project");
  }

  const isFileUpload =
    (body.type === "pdf" || body.type === "image") &&
    !body.url &&
    !body.content;
  if (isFileUpload && !fileStream) {
    throw new Error("File stream required for this resource type");
  }

  // 3. Create pending/ready resource
  const resource = await createResource({
    ...body,
    status: isFileUpload ? "pending" : "ready",
  });

  if (!isFileUpload) return resource;

  // 4. Handle file upload
  try {
    const mType =
      mimeType ||
      body.mimeType ||
      (body.type === "pdf" ? "application/pdf" : "image/jpeg");
    const uploadResult = await storageAdapter.uploadFile(
      ownerId,
      {
        title: body.title,
        mimeType: mType,
        projectId: body.projectId,
        listId: body.listId,
      },
      fileStream as any,
    );

    // 5. Update to ready
    const updatedResource = await updateResource(resource._id.toString(), {
      driveFileId: uploadResult.driveFileId,
      size: uploadResult.size,
      status: "ready",
    });

    return updatedResource || (await findResourceById(resource._id.toString()));
  } catch (error: any) {
    // 6. Rollback on failure
    await deleteResourceById(resource._id.toString());
    throw error;
  }
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
export async function deleteResourceById(id: string) {
  return ResourceModel.findByIdAndDelete(id);
}
