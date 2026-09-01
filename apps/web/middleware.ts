import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Define all routes that do not require authentication
const publicRoutes = [
  "/signin",
  "/terms",
  "/privacy",
  "/api/auth", // NextAuth API routes must be public
  "/health"    // Liveness checks
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoute = publicRoutes.some(route => nextUrl.pathname.startsWith(route));

  // 1. If not logged in and trying to access a protected route -> Redirect to Sign In
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", nextUrl));
  }

  // 2. If logged in and trying to access Sign In -> Redirect to App (Dashboard)
  if (isLoggedIn && nextUrl.pathname === "/signin") {
    return NextResponse.redirect(new URL("/projects", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on all paths EXCEPT static assets, Next.js internals, and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
