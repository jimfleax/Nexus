/**
 * @file auth.ts
 * @description Fastify plugin exposing OAuth 2.0 login flows for Google and GitHub, issuing signed HttpOnly JWT cookies on success.
 * @architecture Public routes — registered BEFORE authPlugin so they are not gated. Each provider flow is a pair of routes:
 *   1. Initiate: redirect the browser to the provider's authorization URL.
 *   2. Callback: exchange the code for a token, fetch the user profile, upsert the user in MongoDB, sign a JWT, set the nexus-session cookie, and redirect home.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { SignJWT } from "jose";
import { findOrCreateUser, updateSettings } from "../services/user.service.js";
import {
  frontendUrl,
  generateState,
  setStateCookie,
  getStateFromCookie,
  clearStateCookie,
  exchangeCodeForToken,
} from "../utils/oauth.js";

/** Build the HMAC-SHA256 signing key from AUTH_SECRET */
function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/* ─── Google OAuth constants ────────────────────────────── */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

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

    const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
      /\/+$/,
      "",
    );
    const redirectUri = `${apiUrl}/api/auth/callback/google`;
    const state = generateState();
    setStateCookie(reply, "oauth_state", state);
    reply.header("Cache-Control", "no-store, max-age=0");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/drive.file",
      // "consent" ensures a refresh_token is always returned, including on re-logins.
      // Without this, Google only returns a refresh_token on the very first authorization,
      // so revoking access and re-logging in would leave the user with no stored token.
      prompt: "consent",
      access_type: "offline",
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
    reply.header("Cache-Control", "no-store, max-age=0");
    const { code, state, error } = request.query as Record<string, string>;

    if (error || !code || !state) {
      fastify.log.warn({ error }, "Google OAuth error or missing code/state");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    const stateCookie = getStateFromCookie(request, "oauth_state");

    if (!stateCookie || stateCookie !== state) {
      fastify.log.warn("Google OAuth state mismatch");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    clearStateCookie(reply, "oauth_state");

    try {
      const clientId = process.env.AUTH_GOOGLE_ID!;
      const clientSecret = process.env.AUTH_GOOGLE_SECRET!;
      const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
        /\/+$/,
        "",
      );
      const redirectUri = `${apiUrl}/api/auth/callback/google`;

      // 1. Exchange code for tokens
      const tokenRes = await exchangeCodeForToken(GOOGLE_TOKEN_URL, {
        code,
        clientId,
        clientSecret,
        redirectUri,
        grant_type: "authorization_code",
      });

      if (!tokenRes.ok) {
        fastify.log.error(
          { status: tokenRes.status, body: await tokenRes.text() },
          "Google token exchange failed",
        );
        return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
      }

      const tokenData = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
      };

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

      // 3. Upsert user in MongoDB and save Drive integration token if present
      if (tokenData.refresh_token) {
        await updateSettings(ownerId, {
          driveRefreshToken: tokenData.refresh_token,
        });
      } else {
        await findOrCreateUser(ownerId);
      }

      // 4. Sign JWT and set cookie
      const jwt = await signSessionJwt({
        sub: ownerId,
        email: profile.email ?? null,
        name: profile.name ?? null,
        image: profile.picture ?? null,
      });

      return reply.redirect(`${frontendUrl()}/api/auth/sync?token=${jwt}`);
    } catch (err) {
      fastify.log.error(err, "Google OAuth callback error");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }
  });
});
