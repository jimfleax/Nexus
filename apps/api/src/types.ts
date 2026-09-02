/**
 * @file types.ts
 * @description Fastify type augmentations for the Nexus API.
 * @architecture Extends FastifyRequest with the ownerId field injected by the auth plugin.
 */

import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** The authenticated owner's ID, set by the auth plugin after JWT verification. */
    ownerId: string;
  }
}
