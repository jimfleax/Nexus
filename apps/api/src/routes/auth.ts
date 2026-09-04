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
import { authorizeWithGoogle } from "../utils/oauth/google.js";
import { frontendUrl, generateState } from "../utils/oauth.js";
import { SessionManager } from "../utils/session.js";

/** Build the HMAC-SHA256 signing key from AUTH_SECRET */
function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

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
  fastify.get(
    "/api/auth/google",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (_request, reply) => {
      const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
        /\/+$/,
        "",
      );
      const redirectUri = `${apiUrl}/api/auth/callback/google`;
      const state = generateState();
      SessionManager.setOAuthState(reply, state);

      try {
        const provider = fastify.oauth.getProvider("google");
        const url = provider.getAuthorizationUrl(state, redirectUri, [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/drive.file",
        ]);
        return reply.redirect(url);
      } catch (err) {
        return reply.status(500).send({ error: "Google OAuth not configured" });
      }
    },
  );

  /**
   * @desc    Handle Google OAuth callback — exchange code, upsert user, issue cookie
   * @route   GET /api/auth/callback/google
   * @access  Public
   */
  fastify.get(
    "/api/auth/callback/google",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { code, state, error } = request.query as Record<string, string>;

      if (error || !code || !state) {
        fastify.log.warn({ error }, "Google OAuth error or missing code/state");
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_missing_params`,
        );
      }

      const stateCookie = SessionManager.getOAuthState(request);

      if (!stateCookie || stateCookie !== state) {
        fastify.log.warn("Google OAuth state mismatch");
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_state`,
        );
      }

      SessionManager.clearOAuthState(reply);

      try {
        const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
          /\/+$/,
          "",
        );
        const redirectUri = `${apiUrl}/api/auth/callback/google`;
        const provider = fastify.oauth.getProvider("google");

        // 1. Exchange code, persist a refresh token when issued, fetch identity
        const { tokens, identity } = await authorizeWithGoogle(
          provider,
          code,
          redirectUri,
          (refreshToken, identity) =>
            updateSettings(identity.id, {
              driveRefreshToken: refreshToken,
            }),
        );

        const ownerId = identity.id;

        // 2. Ensure the account exists when no Drive token was issued
        if (!tokens.refreshToken) {
          await findOrCreateUser(ownerId);
        }

        // 3. Sign JWT and set cookie
        const jwt = await signSessionJwt({
          sub: ownerId,
          email: identity.email,
          name: identity.name,
          image: identity.image,
        });

        return reply.redirect(`${frontendUrl()}/api/auth/sync?token=${jwt}`);
      } catch (err: any) {
        fastify.log.error(err, "Google OAuth callback error");
        if (err.name === "OAuthExchangeError") {
          return reply.redirect(
            `${frontendUrl()}/signin?error=auth_failed_token`,
          );
        }
        if (err.name === "OAuthProfileError") {
          return reply.redirect(
            `${frontendUrl()}/signin?error=auth_failed_userinfo`,
          );
        }
        return reply.redirect(
          `${frontendUrl()}/signin?error=auth_failed_catch`,
        );
      }
    },
  );
});
