/**
 * @file db-utils.ts
 * @description Provides common database utility functions.
 * @architecture Encapsulates reusable Mongoose querying patterns to avoid duplication across service files.
 */
import { Model } from "mongoose";

/**
 * @desc    Update a document by id with `{ $set: updates }`, returning the new document and running schema validators. Returns null when the id is not found.
 * @param   {Model<T>} model - The mongoose model
 * @param   {string} id - The document ID
 * @param   {Record<string, unknown>} updates - The fields to update
 * @returns {Promise<any>} The updated document or null
 */
export async function updateById<T>(
  model: Model<T>,
  id: string,
  updates: Record<string, unknown>,
) {
  return model.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  } as any);
}
