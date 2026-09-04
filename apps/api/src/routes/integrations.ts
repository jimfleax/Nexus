/**
 * @file integrations.ts
 * @description Fastify plugin exposing integration connection flows (e.g., Google Drive).
 * @architecture Authenticated routes — registered AFTER authPlugin so they are gated and request.ownerId is populated.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { updateSettings } from "../services/user.service.js";
import { frontendUrl, generateState } from "../utils/oauth.js";
import { SessionManager } from "../utils/session.js";

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export const integrationRoutes: FastifyPluginAsync = fp(async (fastify) => {
  /**
   * @desc    Initiate Google Drive connection flow
   * @route   GET /api/integrations/google-drive
   * @access  Private
   */
  fastify.get("/api/integrations/google-drive", async (request, reply) => {
    const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
      /\/+$/,
      "",
    );
    const redirectUri = `${apiUrl}/api/integrations/google-drive/callback`;
    const nonce = generateState();
    const ownerId = (request as any).ownerId;

    const stateJwt = await new SignJWT({ nonce, ownerId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(getSigningKey());

    SessionManager.setIntegrationState(reply, stateJwt);

    try {
      const provider = fastify.oauth.getProvider("google");
      const url = provider.getAuthorizationUrl(nonce, redirectUri, [
        "https://www.googleapis.com/auth/drive.file",
      ]);
      return reply.redirect(url);
    } catch (err) {
      return reply.status(500).send({ error: "Google Auth not configured" });
    }
  });

  /**
   * @desc    Handle Google Drive callback — exchange code, update user settings with refresh token
   * @route   GET /api/integrations/google-drive/callback
   * @access  Private (Auth bypassed in authPlugin, verified via state cookie)
   */
  fastify.get(
    "/api/integrations/google-drive/callback",
    async (request: any, reply) => {
      const { code, state, error } = request.query as Record<string, string>;
      if (error || !code || !state) {
        return reply.redirect(`${frontendUrl()}/?error=drive_auth_failed`);
      }

      const stateJwt = SessionManager.getIntegrationState(request);

      if (!stateJwt) {
        return reply.redirect(`${frontendUrl()}/?error=state_missing`);
      }
      SessionManager.clearIntegrationState(reply);

      let ownerId = "";
      try {
        const { payload } = await jwtVerify(stateJwt, getSigningKey());

        if (payload.nonce !== state) {
          return reply.redirect(`${frontendUrl()}/?error=state_mismatch`);
        }

        ownerId = payload.ownerId as string;
      } catch (e) {
        return reply.redirect(`${frontendUrl()}/?error=state_invalid`);
      }

      if (!ownerId) {
        return reply.redirect(`${frontendUrl()}/?error=state_invalid`);
      }

      try {
        const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(
          /\/+$/,
          "",
        );
        const redirectUri = `${apiUrl}/api/integrations/google-drive/callback`;
        const provider = fastify.oauth.getProvider("google");

        const tokens = await provider.exchangeCode(code, redirectUri);

        if (tokens.refreshToken) {
          await updateSettings(ownerId, {
            driveRefreshToken: tokens.refreshToken,
          });
          return reply.redirect(frontendUrl());
        } else {
          return reply.redirect(`${frontendUrl()}/?error=drive_token_missing`);
        }
      } catch (err: any) {
        if (err.name === "OAuthExchangeError") {
          return reply.redirect(`${frontendUrl()}/?error=drive_token_failed`);
        }
        return reply.redirect(
          `${frontendUrl()}/?error=drive_auth_failed_catch`,
        );
      }
    },
  );

  fastify.post(
    "/api/integrations/google-drive/disconnect",
    async (request: any, reply) => {
      const { UserModel } = await import("../models/User.js");

      const user = await UserModel.findOne({ ownerId: request.ownerId });
      if (user?.driveRefreshToken) {
        try {
          const provider = fastify.oauth.getProvider("google");
          await provider.revokeConnection(user.driveRefreshToken);
        } catch (err) {
          request.log.warn(
            err,
            "Failed to revoke token on Google side; proceeding to clear local token.",
          );
        }

        user.driveRefreshToken = undefined;
        await user.save();
      }

      return reply.send({ success: true });
    },
  );
});
