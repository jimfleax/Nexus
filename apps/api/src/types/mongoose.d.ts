import "mongoose";

declare module "mongoose" {
  interface QueryOptions {
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
