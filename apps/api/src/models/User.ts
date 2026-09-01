/**
 * @file User.ts
 * @description Mongoose schema for per-user metadata, primarily Google Drive integration tokens.
 * @architecture Has a unique ownerId key and stores the Drive refresh token/folder used by the storage adapter; deliberately exempt from tenant isolation since users are top-level tenants.
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * @interface IUser
 * @description MongoDB document shape for a user's integration metadata.
 */
export interface IUser extends Document {
  ownerId: string;
  driveRefreshToken?: string;
  driveFolderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    ownerId: { type: String, required: true, unique: true },
    driveRefreshToken: { type: String },
    driveFolderId: { type: String },
  },
  {
    timestamps: true,
  },
);

/**
 * @module UserModel
 * @description Mongoose model for accessing user integration metadata.
 */
export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
