/**
 * @file mongoose.d.ts
 * @description TypeScript ambient module augmentations for Mongoose and MongoDB.
 * @architecture Extends query and update options to support the `skipTenant` flag used by the tenant isolation plugin.
 */
import "mongoose";

declare module "mongoose" {
  interface QueryOptions {
    /** Opt-out of automatic tenant scoping for this query. */
    skipTenant?: boolean;
  }
  interface SaveOptions {
    skipTenant?: boolean;
  }
}

declare module "mongodb" {
  interface FindOptions {
    skipTenant?: boolean;
  }
  interface UpdateOptions {
    skipTenant?: boolean;
  }
  interface DeleteOptions {
    skipTenant?: boolean;
  }
  interface ReplaceOptions {
    skipTenant?: boolean;
  }
  interface CountDocumentsOptions {
    skipTenant?: boolean;
  }
  interface AggregateOptions {
    skipTenant?: boolean;
  }
}
