/**
 * @file db.ts
 * @description Database bootstrap and the tenant-isolation Mongoose plugin that scopes every query and write to the authenticated owner.
 * @architecture Exposes an AsyncLocalStorage tenant context plus a Mongoose plugin that injects ownerId filters on queries, aggregations, and saves, with skipTenant escape hatches for cross-tenant operations.
 */

import mongoose from "mongoose";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * @constant {AsyncLocalStorage<{ ownerId: string }>} tenantContext
 * @description Async-local store that carries the authenticated ownerId through the request lifecycle for tenant scoping.
 */
export const tenantContext = new AsyncLocalStorage<{ ownerId: string }>();

/**
 * @desc    Establish the MongoDB connection using Mongoose with a retry mechanism
 * @param   {string} uri - MongoDB connection string
 * @param   {number} retries - Maximum number of connection attempts
 * @returns {Promise<void>} Resolves once connected
 */
export const connectDB = async (uri: string, retries = 3): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      return;
    } catch (err) {
      if (attempt === retries) {
        console.error(`MongoDB connection failed after ${retries} attempts.`);
        throw err;
      }
      console.warn(`MongoDB connection attempt ${attempt} failed, retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

/**
 * @desc    Mongoose plugin factory that enforces per-owner data isolation on queries, aggregates, and saves
 * @param   {mongoose.Schema} schema - The Mongoose schema to harden for multi-tenancy
 */
export function tenantIsolationPlugin(schema: mongoose.Schema) {
  // Ensure the schema has an ownerId field
  if (!schema.path("ownerId")) {
    schema.add({ ownerId: { type: String, required: true, index: true } });
  }

  const injectTenant = function (this: mongoose.Query<any, any>) {
    if (this.getOptions().skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error(
        "Tenant context missing. Set skipTenant: true to bypass.",
      );
    }

    this.where({ ownerId: store.ownerId });
  };

  const queryMethods = [
    "countDocuments",
    "deleteMany",
    "deleteOne",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndReplace",
    "findOneAndUpdate",
    "replaceOne",
    "updateMany",
    "updateOne",
  ];

  queryMethods.forEach((method) => {
    schema.pre(method as any, injectTenant);
  });

  schema.pre("aggregate", function () {
    if (this.options && this.options.skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error(
        "Tenant context missing. Set skipTenant: true to bypass.",
      );
    }

    this.pipeline().unshift({ $match: { ownerId: store.ownerId } });
  });

  const injectTenantOnSave = function (this: any) {
    if (this.$locals?.skipTenant) {
      return;
    }

    const store = tenantContext.getStore();
    if (!store || !store.ownerId) {
      throw new Error("Tenant context missing on save.");
    }

    if (!this.ownerId) {
      this.ownerId = store.ownerId;
    } else if (this.ownerId !== store.ownerId) {
      throw new Error("Tenant context mismatch on save.");
    }
  };

  schema.pre("validate", injectTenantOnSave);
  schema.pre("save", injectTenantOnSave);
}
