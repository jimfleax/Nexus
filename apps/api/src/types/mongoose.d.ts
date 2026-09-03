import "mongoose";

declare module "mongoose" {
  interface QueryOptions {
    skipTenant?: boolean;
  }
  interface SaveOptions {
    skipTenant?: boolean;
  }
}
