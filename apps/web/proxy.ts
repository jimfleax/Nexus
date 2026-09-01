/**
 * @file proxy.ts
 * @description Next.js middleware proxy that applies the auth guard to protected routes.
 * @architecture Re-exports the NextAuth auth helper and scopes it with a matcher that skips auth, static, and sign-in routes.
 */

import { auth } from "@/auth";

/**
 * @desc    NextAuth middleware wrapper used by Next.js as the route guard
 */
export default auth;

/**
 * @constant {object} config
 * @description Matcher controlling which routes the auth middleware protects.
 */
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|nexus-icon|site.webmanifest|apple-touch-icon|signin).*)",
  ],
};
