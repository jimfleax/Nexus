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

    const redirectUri = `${frontendUrl()}/api/auth/callback/google`;
    const state = generateState();
    setStateCookie(reply, "oauth_state", state);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/drive.file",
      prompt: "select_account",
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
      const redirectUri = `${frontendUrl()}/api/auth/callback/google`;

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

    const redirectUri = `${frontendUrl()}/api/auth/callback/github`;
    const state = generateState();
    setStateCookie(reply, "oauth_state", state);

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

    const stateCookie = getStateFromCookie(request, "oauth_state");

    if (!stateCookie || stateCookie !== state) {
      fastify.log.warn("GitHub OAuth state mismatch");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }

    clearStateCookie(reply, "oauth_state");

    try {
      const clientId = process.env.AUTH_GITHUB_ID!;
      const clientSecret = process.env.AUTH_GITHUB_SECRET!;
      const redirectUri = `${frontendUrl()}/api/auth/callback/github`;

      // 1. Exchange code for access token
      const tokenRes = await exchangeCodeForToken(
        GITHUB_TOKEN_URL,
        {
          code,
          clientId,
          clientSecret,
          redirectUri,
        },
        {
          Accept: "application/json",
        },
      );

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
      await findOrCreateUser(ownerId);

      // 4. Sign JWT and set cookie
      const jwt = await signSessionJwt({
        sub: ownerId,
        email,
        name: profile.name ?? profile.login ?? null,
        image: profile.avatar_url ?? null,
      });

      return reply.redirect(`${frontendUrl()}/api/auth/sync?token=${jwt}`);
    } catch (err) {
      fastify.log.error(err, "GitHub OAuth callback error");
      return reply.redirect(`${frontendUrl()}/signin?error=auth_failed`);
    }
  });
});
