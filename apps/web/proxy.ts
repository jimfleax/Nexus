/**
 * @file proxy.ts
 * @description Next.js Edge middleware that guards dashboard routes using the nexus-session HttpOnly cookie.
 * @architecture Replaces NextAuth's built-in middleware. Verifies the nexus-session JWT cookie with jose so expired or
 *   invalid sessions fall through to /signin instead of bouncing back to /projects. Unauthenticated users are redirected
 *   to /signin; authenticated users hitting /signin are bounced to /projects.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * @desc    Validate the nexus-session JWT cookie so expired or tampered sessions aren't treated as logged in
 */
async function isSessionValid(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("nexus-session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

/**
 * @desc    Route guard: redirect unauthenticated users to /signin, authenticated users away from /signin
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = [
    "/signin",
    "/terms",
    "/policy",
    "/privacy",
    "/api/",
    "/health",
    "/_next",
    "/favicon",
  ].some((p) => pathname.startsWith(p));

  const isLoggedIn = await isSessionValid(request);

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (isLoggedIn && pathname === "/signin") {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths EXCEPT static assets, Next.js internals, and images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
