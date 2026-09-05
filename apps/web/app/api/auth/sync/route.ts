/**
 * @file route.ts
 * @description Next.js Route Handler for syncing backend OAuth tokens to the frontend session.
 * @architecture Handles redirect from the API auth flow and stores the JWT as an HttpOnly cookie.
 */
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * @desc Handles GET requests with a token query param to establish the local session.
 * @param {Request} request - The incoming HTTP request
 * @returns {Promise<NextResponse>} Redirect response
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/signin?error=auth_failed_sync", request.url),
    );
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(
      new URL("/signin?error=auth_failed_sync", request.url),
    );
  }

  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { clockTolerance: 30 });
  } catch {
    return NextResponse.redirect(
      new URL("/signin?error=auth_failed_sync", request.url),
    );
  }

  const response = NextResponse.redirect(new URL("/projects", request.url));

  response.cookies.set("nexus-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2592000, // 30 days
  });

  return response;
}
