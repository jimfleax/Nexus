/**
 * @file auth.ts
 * @description Fastify plugin exposing OAuth 2.0 login flows for Google and GitHub, issuing signed HttpOnly JWT cookies on success.
 * @architecture Public routes — registered BEFORE authPlugin so they are not gated. Each provider flow is a pair of routes:
 *   1. Initiate: redirect the browser to the provider's authorization URL.
 *   2. Callback: exchange the code for a token, fetch the user profile, upsert the user in MongoDB, sign a JWT, set the nexus-session cookie, and redirect home.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { UserModel } from "../models/User.js";

/** Build the HMAC-SHA256 signing key from AUTH_SECRET */
function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/** Emit the nexus-session Set-Cookie header */
function sessionCookie(jwt: string): string {
  return `nexus-session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
}

/** Clear the nexus-session cookie */
function clearCookie(): string {
  return "nexus-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

const apiUrl = () =>
  (process.env.API_URL || "http://localhost:8080").replace(/\/+$/, "");

/* ─── Google OAuth constants ────────────────────────────── */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/* ─── GitHub OAuth constants ─────────────────────────────── */

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USERINFO_URL = "https://api.github.com/user";

/* ─── Helpers ────────────────────────────────────────────── */

/**
 * @desc    Sign a JWT containing the user's identity and return the compact string
 */
async function signSessionJwt(payload: {
  sub: string;
  email: string | null;
  name: string | null;
  image: string | null;
}): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    image: payload.image,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSigningKey());
}

/**
 * @desc    Upsert a user record by their OAuth subject identifier (ownerId).
 *          Uses { skipTenant: true } because no tenant context exists during OAuth callbacks.
 */
async function upsertUser(ownerId: string): Promise<void> {
  const existing = await (UserModel as any)
    .findOne({ ownerId })
    .setOptions({ skipTenant: true });

  if (!existing) {
    await (UserModel as any)
      .create([{ ownerId }], { skipTenant: true } as any)
      .catch(() => {
        // If race-condition duplicate insert, ignore
      });
  }
}

/* ─── Plugin ─────────────────────────────────────────────── */

/**
 * @module authRoutes
 * @description Fastify plugin registering all public /api/auth/* routes.
 */
export const authRoutes: FastifyPluginAsync = fp(async (fastify) => {
  /* ════════════════════════════════════════════
     GOOGLE
  ════════════════════════════════════════════ */

  /**
   * @desc    Initiate Google OAuth flow
   * @route   GET /api/auth/google
   * @access  Public
   */
  fastify.get("/api/auth/google", async (_request, reply) => {
    const clientId = process.env.AUTH_GOOGLE_ID;
    if (!clientId) {
      return reply.status(500).send({ error: "Google OAuth not configured" });
    }

    const redirectUri = `${apiUrl()}/api/auth/callback/google`;
    const state = crypto.randomBytes(16).toString("hex");
    reply.header(
      "Set-Cookie",
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
      state,
    });

    return reply.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  /**
   * @desc    Handle Google OAuth callback — exchange code, upsert user, issue cookie
   * @route   GET /api/auth/callback/google
   * @access  Public
   */
  fastify.get("/api/auth/callback/google", async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>;

    if (error || !code || !state) {
      fastify.log.warn({ error }, "Google OAuth error or missing code/state");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    const cookieHeader = request.headers.cookie ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
    const stateCookie = match?.[1];

    if (!stateCookie || stateCookie !== state) {
      fastify.log.warn("Google OAuth state mismatch");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    reply.header(
      "Set-Cookie",
      `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    );

    try {
      const clientId = process.env.AUTH_GOOGLE_ID!;
      const clientSecret = process.env.AUTH_GOOGLE_SECRET!;
      const redirectUri = `${apiUrl()}/api/auth/callback/google`;

      // 1. Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        fastify.log.error(
          { status: tokenRes.status, body: await tokenRes.text() },
          "Google token exchange failed",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // 2. Fetch user profile
      const userRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        fastify.log.error(
          { status: userRes.status },
          "Google userinfo fetch failed",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      const profile = (await userRes.json()) as {
        sub: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      const ownerId = `google_${profile.sub}`;

      // 3. Upsert user in MongoDB
      await upsertUser(ownerId);

      // 4. Sign JWT and set cookie
      const jwt = await signSessionJwt({
        sub: ownerId,
        email: profile.email ?? null,
        name: profile.name ?? null,
        image: profile.picture ?? null,
      });

      reply.header("Set-Cookie", sessionCookie(jwt));
      return reply.redirect(`${frontendUrl()}/projects`);
    } catch (err) {
      fastify.log.error(err, "Google OAuth callback error");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }
  });

  /* ════════════════════════════════════════════
     GITHUB
  ════════════════════════════════════════════ */

  /**
   * @desc    Initiate GitHub OAuth flow
   * @route   GET /api/auth/github
   * @access  Public
   */
  fastify.get("/api/auth/github", async (_request, reply) => {
    const clientId = process.env.AUTH_GITHUB_ID;
    if (!clientId) {
      return reply.status(500).send({ error: "GitHub OAuth not configured" });
    }

    const redirectUri = `${apiUrl()}/api/auth/callback/github`;
    const state = crypto.randomBytes(16).toString("hex");
    reply.header(
      "Set-Cookie",
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=300`,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });

    return reply.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`);
  });

  /**
   * @desc    Handle GitHub OAuth callback — exchange code, upsert user, issue cookie
   * @route   GET /api/auth/callback/github
   * @access  Public
   */
  fastify.get("/api/auth/callback/github", async (request, reply) => {
    const { code, state, error } = request.query as Record<string, string>;

    if (error || !code || !state) {
      fastify.log.warn({ error }, "GitHub OAuth error or missing code/state");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    const cookieHeader = request.headers.cookie ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
    const stateCookie = match?.[1];

    if (!stateCookie || stateCookie !== state) {
      fastify.log.warn("GitHub OAuth state mismatch");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    reply.header(
      "Set-Cookie",
      `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    );

    try {
      const clientId = process.env.AUTH_GITHUB_ID!;
      const clientSecret = process.env.AUTH_GITHUB_SECRET!;
      const redirectUri = `${apiUrl()}/api/auth/callback/github`;

      // 1. Exchange code for access token
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        fastify.log.error(
          { status: tokenRes.status, body: await tokenRes.text() },
          "GitHub token exchange failed",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token || tokenData.error) {
        fastify.log.error(
          { error: tokenData.error },
          "GitHub token exchange returned error",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      // 2. Fetch user profile
      const userRes = await fetch(GITHUB_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!userRes.ok) {
        fastify.log.error(
          { status: userRes.status },
          "GitHub user fetch failed",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      const profile = (await userRes.json()) as {
        id: number;
        login: string;
        name?: string;
        email?: string;
        avatar_url?: string;
      };

      // 2b. Fetch primary email if not included in profile
      let email = profile.email ?? null;
      if (!email) {
        try {
          const emailRes = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          if (emailRes.ok) {
            const emails = (await emailRes.json()) as Array<{
              email: string;
              primary: boolean;
              verified: boolean;
            }>;
            const primary = emails.find((e) => e.primary && e.verified);
            if (primary) email = primary.email;
          }
        } catch {
          // Non-fatal — proceed without email
        }
      }

      const ownerId = `github_${profile.id}`;

      // 3. Upsert user in MongoDB
      await upsertUser(ownerId);

      // 4. Sign JWT and set cookie
      const jwt = await signSessionJwt({
        sub: ownerId,
        email,
        name: profile.name ?? profile.login ?? null,
        image: profile.avatar_url ?? null,
      });

      reply.header("Set-Cookie", sessionCookie(jwt));
      return reply.redirect(`${frontendUrl()}/projects`);
    } catch (err) {
      fastify.log.error(err, "GitHub OAuth callback error");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }
  });

  /* ════════════════════════════════════════════
     SESSION MANAGEMENT
  ════════════════════════════════════════════ */

  /**
   * @desc    Return the current user from the nexus-session JWT
   * @route   GET /api/auth/me
   * @access  Public (checked manually)
   */
  fastify.get("/api/auth/me", async (request, reply) => {
    const cookieHeader = request.headers.cookie ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)nexus-session=([^;]+)/);
    const token = match?.[1];

    if (!token) {
      return reply.status(401).send({ error: "Not authenticated" });
    }

    try {
      const { payload } = await jwtVerify(token, getSigningKey());

      const ownerId = payload.sub;
      if (!ownerId) {
        return reply.status(401).send({ error: "Invalid session" });
      }

      // Ensure the user record exists
      const user = await (UserModel as any)
        .findOne({ ownerId })
        .setOptions({ skipTenant: true });

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      return reply.send({
        id: ownerId,
        email: (payload.email as string) ?? null,
        name: (payload.name as string) ?? null,
        image: (payload.image as string) ?? null,
      });
    } catch (err) {
      fastify.log.warn(err, "nexus-session JWT verification failed");
      return reply.status(401).send({ error: "Invalid or expired session" });
    }
  });

  /**
   * @desc    Sign out by clearing the nexus-session cookie
   * @route   POST /api/auth/signout
   * @access  Public
   */
  fastify.post("/api/auth/signout", async (_request, reply) => {
    reply.header("Set-Cookie", clearCookie());
    return reply.send({ ok: true });
  });
});
