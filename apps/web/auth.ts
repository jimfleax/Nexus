/**
 * @file auth.ts
 * @description NextAuth v5 configuration wiring GitHub and Google OAuth with Drive offline access.
 * @architecture Uses JWT sessions, syncs the Google refresh token to the backend, exposes authenticated middleware, and gates routes via the authorized callback.
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { SignJWT } from "jose";

/**
 * @module {NextAuth|handlers}
 * @description Exports the NextAuth handlers, auth helper, and sign-in/out methods.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    /**
     * @desc    Persist the Google refresh token by syncing it to the backend after sign-in
     */
    async jwt({ token, account }) {
      if (
        account?.provider === "google" &&
        account.refresh_token &&
        token.sub
      ) {
        try {
          const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
          const signedToken = await new SignJWT({ sub: token.sub })
            .setProtectedHeader({ alg: "HS256" })
            .sign(secret);

          await fetch(
            `${process.env.API_URL || "http://localhost:8080"}/api/user/settings`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${signedToken}`,
              },
              body: JSON.stringify({
                driveRefreshToken: account.refresh_token,
              }),
            },
          );
        } catch (e) {
          console.error("Failed to sync refresh token to backend", e);
        }
      }
      return token;
    },
    /**
     * @desc    Surface the user ID on the session object for client use
     */
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    /**
     * @desc    Gate routes natively. Return false to redirect to signin, true to proceed, or a Response to redirect elsewhere.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = ["/signin", "/terms", "/policy", "/api", "/health"].some(route => nextUrl.pathname.startsWith(route));

      // 1. If not logged in and not a public route -> NextAuth will redirect to signin page
      if (!isLoggedIn && !isPublicRoute) {
        return false;
      }

      // 2. If logged in and trying to access signin -> Redirect to App (Dashboard)
      if (isLoggedIn && nextUrl.pathname === "/signin") {
        return Response.redirect(new URL("/projects", nextUrl));
      }

      return true;
    },
  },
});
