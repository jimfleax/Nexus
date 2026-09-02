/**
 * @file project.service.ts
 * @description Business logic for project operations, extracted from route handlers.
 * @architecture Pure Mongoose operations that depend only on models and the tenant context.
 *              No HTTP/Fastify coupling — fully unit-testable with an in-memory MongoDB.
 */

import { ProjectModel } from "../models/Project.js";
import { KnowledgeListModel } from "../models/KnowledgeList.js";
import { slugify } from "./slugify.js";

/**
 * @desc    List all projects for the current tenant, enriched with list counts via aggregation
 * @returns {Promise<Array>} Projects with listCount field
 */
export async function listProjectsWithCounts() {
  return ProjectModel.aggregate([
    {
      $lookup: {
        from: "knowledgelists",
        let: { projectId: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$projectId", "$$projectId"] },
            },
          },
          { $count: "count" },
        ],
        as: "listData",
      },
    },
    {
      $addFields: {
        id: { $toString: "$_id" },
        listCount: {
          $ifNull: [{ $arrayElemAt: ["$listData.count", 0] }, 0],
        },
      },
    },
    { $project: { listData: 0, __v: 0 } },
    { $sort: { createdAt: -1 } },
  ]);
}

/**
 * @desc    Create a new project with auto-generated slug
 * @param   {object} input - Project data (name, description, icon)
 * @returns {Promise<{ project: any }>} The saved project
 * @throws  {{ code: number }} MongoDB duplicate key error (code 11000) when name conflicts
 */
export async function createProject(input: {
  name: string;
  description?: string;
  icon?: string;
}) {
  const slug = slugify(input.name);
  const project = new ProjectModel({ ...input, slug });
  await project.save();
  return project;
}

/**
 * @desc    Update a project by ID, regenerating slug when renamed
 * @param   {string} id - The project ID
 * @param   {object} input - Partial project data
 * @returns {Promise<any|null>} The updated project, or null if not found
 * @throws  {{ code: number }} MongoDB duplicate key error (code 11000) when name conflicts
 */
export async function updateProject(
  id: string,
  input: { name?: string; description?: string; icon?: string },
) {
  const updates: Record<string, unknown> = { ...input };

  if (input.name) {
    updates.slug = slugify(input.name);
  }

  return ProjectModel.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  } as any);
}

/**
 * @desc    Find a project by ID
 * @param   {string} id - The project ID
 * @returns {Promise<any|null>} The project document, or null
 */
export async function findProjectById(id: string) {
  return ProjectModel.findById(id);
}

/**
 * @desc    Delete a project by ID
 * @param   {string} id - The project ID
 * @returns {Promise<any|null>} The deleted project, or null
 */
export async function deleteProjectById(id: string) {
  return ProjectModel.findByIdAndDelete(id);
}
