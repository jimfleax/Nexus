/**
 * @file list.service.ts
 * @description Business logic for knowledge list operations, extracted from route handlers.
 * @architecture Pure Mongoose operations. Handles slug generation, position calculation,
 *              and bulk reorder logic.
 */

import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { ProjectModel } from "../models/Project.js";
import { slugify } from "./slugify.js";

/**
 * @desc    List all knowledge lists for a project, ordered by position
 * @param   {string} projectId - The project ID
 * @returns {Promise<Array>} Ordered list documents
 */
export async function listByProject(projectId: string) {
  return KnowledgeListModel.find({ projectId }).sort({ position: 1 });
}

/**
 * @desc    Find a knowledge list by ID
 * @param   {string} id - The list ID
 * @returns {Promise<any|null>} The list document, or null
 */
export async function findListById(id: string) {
  return KnowledgeListModel.findById(id);
}

/**
 * @desc    Create a new knowledge list in a project, computing position automatically
 * @param   {string} projectId - The project to add the list to
 * @param   {object} input - List data (name, description)
 * @returns {Promise<{ list: any }>} The saved list
 * @throws  If the project does not exist
 * @throws  {{ code: number }} MongoDB duplicate key error (code 11000) when name conflicts
 */
export async function createList(
  projectId: string,
  input: { name: string; description?: string },
) {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const slug = slugify(input.name);

  // Find highest position to append to end
  const lastList = await KnowledgeListModel.findOne({ projectId }).sort({
    position: -1,
  });
  const position = lastList ? lastList.position + 1 : 0;

  const list = new KnowledgeListModel({
    ...input,
    projectId,
    slug,
    position,
  });

  await list.save();
  return list;
}

/**
 * @desc    Update a knowledge list by ID, regenerating slug when renamed
 * @param   {string} id - The list ID
 * @param   {object} input - Partial list data (name, description)
 * @returns {Promise<any|null>} The updated list, or null
 * @throws  {{ code: number }} MongoDB duplicate key error (code 11000) when name conflicts
 */
export async function updateList(
  id: string,
  input: { name?: string; description?: string },
) {
  const updates: Record<string, unknown> = { ...input };

  if (input.name) {
    updates.slug = slugify(input.name);
  }

  return KnowledgeListModel.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  } as any);
}

/**
 * @desc    Bulk-reorder lists within a project via atomic position updates
 * @param   {string} projectId - The project scope
 * @param   {string} ownerId - The owner for tenant scoping
 * @param   {Array<{ id: string; position: number }>} items - Ordered list ID/position pairs
 * @returns {Promise<void>}
 */
export async function reorderLists(
  projectId: string,
  ownerId: string,
  items: Array<{ id: string; position: number }>,
) {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, projectId, ownerId },
      update: { $set: { position: item.position } },
    },
  }));

  if (bulkOps.length > 0) {
    await KnowledgeListModel.bulkWrite(bulkOps);
  }
}
