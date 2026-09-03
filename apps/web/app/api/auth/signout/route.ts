/**
 * @file route.ts
 * @description Next.js Route Handler for signing out.
 * @architecture Proxies the sign-out action by clearing the secure HttpOnly session cookie locally.
 */
import { NextResponse } from "next/server";

/**
 * @desc Handles POST requests to sign out the user, clearing the `nexus-session` cookie.
 * @returns {Promise<NextResponse>} JSON response
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("nexus-session");
  return response;
}
