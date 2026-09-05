/**
 * @file session.ts
 * @description Server-side session helpers shared across the app.
 * @architecture Reads the nexus-session HttpOnly cookie via next/headers and verifies it
 *   with jose's jwtVerify against AUTH_SECRET, returning the decoded user payload or null.
 *   Used by the dashboard layout guard and the public homepage's authenticated-user redirect.
 */
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/**
 * @desc    Verify the nexus-session JWT and return the decoded user payload, or null if invalid
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nexus-session")?.value;
    if (!token) return null;

    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { clockTolerance: 30 }); // Allow 30s clock skew

    if (!payload.sub) return null;

    return {
      id: payload.sub,
      name: (payload.name as string) ?? null,
      email: (payload.email as string) ?? null,
      image: (payload.image as string) ?? null,
    };
  } catch (err) {
    console.error("JWT Verification failed in lib/session.ts:", err);
    return null;
  }
}
