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
  checksum?: string;
  createdAt: Date;
  updatedAt: Date;
  ai?: {
    summary?: string;
    shortSummary?: string;
    topics?: string[];
    tags?: string[];
    entities?: { name: string; type: string }[];
    keyPoints?: string[];
    keywords?: string[];
    language?: string;
    sentiment?: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    contentType?: string;
    processedAt?: Date;
    model?: string;
    version?: string;
  };
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
    url: { type: String },
    tags: { type: [String], default: [] },
    isFavorite: { type: Boolean, default: false },
    size: { type: Number },
    checksum: { type: String },
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
    ai: {
      summary: { type: String },
      shortSummary: { type: String },
      topics: { type: [String] },
      tags: { type: [String] },
      entities: [
        {
          name: { type: String, required: true },
          type: { type: String, required: true },
        },
      ],
      keyPoints: { type: [String] },
      keywords: { type: [String] },
      language: { type: String },
      sentiment: { type: String },
      difficulty: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
      contentType: { type: String },
      processedAt: { type: Date },
      model: { type: String },
      version: { type: String },
    },
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
ResourceSchema.index({ ownerId: 1, checksum: 1 });
ResourceSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
    "ai.shortSummary": "text",
    "ai.topics": "text",
    "ai.keywords": "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      description: 2,
      "ai.shortSummary": 1,
      "ai.topics": 1,
      "ai.keywords": 1,
    },
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
