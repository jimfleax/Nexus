/**
 * @file proxy.ts
 * @description Next.js Edge middleware that guards dashboard routes using the nexus-session HttpOnly cookie.
 * @architecture Replaces NextAuth's built-in middleware. Reads the nexus-session cookie directly (no JWT decode
 *   needed at this layer — presence is sufficient for routing decisions; the actual JWT is verified server-side
 *   and by Fastify on every API call). Unauthenticated users are redirected to /signin; authenticated users
 *   hitting /signin are bounced to /projects.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * @desc    Route guard: redirect unauthenticated users to /signin, authenticated users away from /signin
 */
export function middleware(request: NextRequest) {
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

  const isLoggedIn = request.cookies.has("nexus-session");

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
