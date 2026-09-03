/**
 * @file User.ts
 * @description Mongoose schema for per-user metadata, primarily Google Drive integration tokens.
 * @architecture Has a unique ownerId key and stores the Drive refresh token/folder used by the storage adapter; deliberately exempt from tenant isolation since users are top-level tenants.
 */

import mongoose, { Schema, Document } from "mongoose";

import { encrypt, decrypt } from "../utils/crypto.js";

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
    driveRefreshToken: {
      type: String,
      get: (val: string | undefined) => {
        if (!val) return val;
        try {
          return decrypt(val);
        } catch (err: any) {
          if (
            err.message ===
            "TOKEN_ENCRYPTION_KEY must be defined in the environment"
          ) {
            throw err;
          }
          return val; // Fallback for unencrypted legacy tokens
        }
      },
      set: (val: string | undefined) => {
        if (!val) return val;
        try {
          return encrypt(val);
        } catch (err: any) {
          if (
            err.message ===
            "TOKEN_ENCRYPTION_KEY must be defined in the environment"
          ) {
            throw err;
          }
          return val;
        }
      },
    },
    driveFolderId: { type: String },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

/**
 * @module UserModel
 * @description Mongoose model for accessing user integration metadata.
 */
export const UserModel =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
