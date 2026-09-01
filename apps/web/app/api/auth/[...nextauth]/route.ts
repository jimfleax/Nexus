/**
 * @file route.ts
 * @description NextAuth catch-all handler mounting the auth flow (GET/POST) from the shared auth config.
 * @architecture Re-exports the NextAuth HTTP handlers defined in @/auth, adding the public /api/auth endpoints.
 */

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";
import { handlers } from "../../../../auth";

export const { GET, POST } = handlers;
