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
        } catch {
          return val; // Fallback for unencrypted legacy tokens
        }
      },
      set: (val: string | undefined) => {
        if (!val) return val;
        try {
          // If it's already encrypted, encrypting it again will result in a double encryption.
          // But since the value passed to setter is usually plaintext, we encrypt it.
          // To avoid double encrypting, let's just encrypt. If someone passes an encrypted value, it gets encrypted again.
          // Since we shouldn't ever pass an encrypted value from the app side, this is fine.
          return encrypt(val);
        } catch {
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
