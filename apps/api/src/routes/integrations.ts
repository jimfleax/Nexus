/**
 * @file integrations.ts
 * @description Fastify plugin exposing integration connection flows (e.g., Google Drive).
 * @architecture Authenticated routes — registered AFTER authPlugin so they are gated and request.ownerId is populated.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { updateSettings } from "../services/user.service.js";
import { authorizeWithGoogle } from "../utils/oauth/google.js";
import { frontendUrl, generateState } from "../utils/oauth.js";
import { SessionManager } from "../utils/session.js";

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
    const rawState = generateState();
    const state = Buffer.from(
      JSON.stringify({ nonce: rawState, ownerId: (request as any).ownerId }),
    ).toString("base64");

    SessionManager.setIntegrationState(reply, state);

    try {
      const provider = fastify.oauth.getProvider("google");
      const url = provider.getAuthorizationUrl(state, redirectUri, [
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

      const stateCookie = SessionManager.getIntegrationState(request);

      if (!stateCookie || stateCookie !== state) {
        return reply.redirect(`${frontendUrl()}/?error=state_mismatch`);
      }
      SessionManager.clearIntegrationState(reply);

      let ownerId = "";
      try {
        const decoded = JSON.parse(
          Buffer.from(state, "base64").toString("utf8"),
        );
        ownerId = decoded.ownerId;
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

        const { tokens } = await authorizeWithGoogle(
          provider,
          code,
          redirectUri,
          (refreshToken) =>
            updateSettings(ownerId, {
              driveRefreshToken: refreshToken,
            }),
        );

        if (tokens.refreshToken) {
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
