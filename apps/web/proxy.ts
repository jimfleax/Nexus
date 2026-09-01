import { auth } from "@/auth";

export default auth;

export const config = {
  // Run on all paths EXCEPT static assets, Next.js internals, and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
