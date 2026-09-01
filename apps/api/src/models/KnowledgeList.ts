/**
 * @file KnowledgeList.ts
 * @description Mongoose schema for a project's knowledge lists (ordered collections of resources).
 * @architecture Enforces tenant isolation, keeps a unique slug per project/owner, and orders lists via a positional index.
 */

import mongoose, { Schema, Document } from "mongoose";
import { tenantIsolationPlugin } from "../db.js";
import { KnowledgeList } from "@nexus/shared";

/**
 * @interface IKnowledgeList
 * @description MongoDB document shape for a knowledge list, composing the shared DTO with tenant and timestamps.
 */
export interface IKnowledgeList
  extends Omit<KnowledgeList, "id" | "createdAt" | "updatedAt">, Document {
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeListSchema = new Schema<IKnowledgeList>(
  {
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    position: { type: Number, required: true },
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

KnowledgeListSchema.index({ ownerId: 1, projectId: 1, position: 1 });
KnowledgeListSchema.index(
  { ownerId: 1, projectId: 1, slug: 1 },
  { unique: true },
);

KnowledgeListSchema.plugin(tenantIsolationPlugin);

/**
 * @module KnowledgeListModel
 * @description Mongoose model for querying knowledge lists within the tenant-isolated context.
 */
export const KnowledgeListModel =
  mongoose.models.KnowledgeList ||
  mongoose.model<IKnowledgeList>("KnowledgeList", KnowledgeListSchema);
