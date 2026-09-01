/**
 * @file Project.ts
 * @description Mongoose schema for a user's projects, the top-level containers for knowledge lists.
 * @architecture Adds a per-owner unique slug index and the tenant isolation plugin to scope queries and writes.
 */

import mongoose, { Schema, Document } from "mongoose";
import { tenantIsolationPlugin } from "../db.js";
import { Project } from "@nexus/shared";

// Omit id because mongoose uses _id, but we'll map it in the transform
/**
 * @interface IProject
 * @description MongoDB document shape for a project, composing the shared DTO with tenant and timestamps.
 */
export interface IProject
  extends Omit<Project, "id" | "createdAt" | "updatedAt">, Document {
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true }, // We'll enforce unique per owner later if needed, but uniqueness across all requires careful tenant scoping or just compound index
    description: { type: String },
    icon: { type: String },
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

// Slug uniqueness per tenant
ProjectSchema.index({ ownerId: 1, slug: 1 }, { unique: true });

ProjectSchema.plugin(tenantIsolationPlugin);

/**
 * @module ProjectModel
 * @description Mongoose model for querying projects within the tenant-isolated context.
 */
export const ProjectModel =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
