/**
 * @file Resource.ts
 * @description Mongoose schema for resources — the unified item type (markdown, pdf, image, ebook, text, url, note, chat) stored inside knowledge lists.
 * @architecture Indexes by owner/project/list for navigation, a weighted $text index for search, optional Drive-backed file uploads, and tenant-isolated queries.
 */

import mongoose, { Schema, Document } from "mongoose";
import { tenantIsolationPlugin } from "../db.js";
import { Resource } from "@nexus/shared";

/**
 * @interface IResource
 * @description MongoDB document shape for a resource, composing the shared DTO with tenant, size, and timestamps.
 */
export interface IResource
  extends Omit<Resource, "id" | "createdAt" | "updatedAt">, Document {
  ownerId: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    projectId: { type: String, required: true, index: true },
    listId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "markdown",
        "pdf",
        "image",
        "ebook",
        "text",
        "url",
        "note",
        "chat",
      ],
    },
    mimeType: { type: String },
    description: { type: String },
    content: { type: String },
    url: { type: String },
    tags: { type: [String], default: [] },
    isFavorite: { type: Boolean, default: false },
    size: { type: Number },
    status: {
      type: String,
      enum: ["pending", "ready", "error"],
      default: "ready",
    },
    uploadUri: { type: String },
    driveFileId: { type: String },
    lastOpenedAt: { type: Date },
    readingTime: { type: String },
    ownerId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  },
);

ResourceSchema.index({ ownerId: 1, projectId: 1, listId: 1 });
ResourceSchema.index(
  { title: "text", description: "text", tags: "text", content: "text" },
  {
    weights: { title: 10, tags: 5, description: 2, content: 1 },
    name: "resource_text_index",
  },
);
ResourceSchema.plugin(tenantIsolationPlugin);

/**
 * @module ResourceModel
 * @description Mongoose model for querying resources within the tenant-isolated context.
 */
export const ResourceModel =
  mongoose.models.Resource ||
  mongoose.model<IResource>("Resource", ResourceSchema);
