/**
 * @file integrations.ts
 * @description Fastify plugin exposing integration connection flows (e.g., Google Drive).
 * @architecture Authenticated routes — registered AFTER authPlugin so they are gated and request.ownerId is populated.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { updateSettings } from "../services/user.service.js";

const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Helper to emit secure cookie attributes */
const cookieOptions = () =>
  `HttpOnly; ${frontendUrl().startsWith("https://") ? "Secure; " : ""}SameSite=Lax; Path=/`;

export const integrationRoutes: FastifyPluginAsync = fp(async (fastify) => {
  /**
   * @desc    Initiate Google Drive connection flow
   * @route   GET /api/integrations/google-drive
   * @access  Private
   */
  fastify.get("/api/integrations/google-drive", async (request, reply) => {
    const clientId = process.env.AUTH_GOOGLE_ID;
    if (!clientId) {
      return reply.status(500).send({ error: "Google Auth not configured" });
    }

    const redirectUri = `${frontendUrl()}/api/integrations/google-drive/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    reply.header(
      "Set-Cookie",
      `integration_state=${state}; ${cookieOptions()}; Max-Age=300`,
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/drive.file",
      prompt: "consent",
      access_type: "offline",
      state,
    });

    return reply.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  });

  /**
   * @desc    Handle Google Drive callback — exchange code, update user settings with refresh token
   * @route   GET /api/integrations/google-drive/callback
   * @access  Private
   */
  fastify.get(
    "/api/integrations/google-drive/callback",
    async (request: any, reply) => {
      const { code, state, error } = request.query as Record<string, string>;
      if (error || !code || !state) {
        return reply.redirect(`${frontendUrl()}/?error=drive_auth_failed`);
      }

      const cookieHeader = request.headers.cookie ?? "";
      const match = cookieHeader.match(/(?:^|;\s*)integration_state=([^;]+)/);
      const stateCookie = match?.[1];

      if (!stateCookie || stateCookie !== state) {
        return reply.redirect(`${frontendUrl()}/?error=state_mismatch`);
      }
      reply.header(
        "Set-Cookie",
        `integration_state=; ${cookieOptions()}; Max-Age=0`,
      );

      const clientId = process.env.AUTH_GOOGLE_ID!;
      const clientSecret = process.env.AUTH_GOOGLE_SECRET!;
      const redirectUri = `${frontendUrl()}/api/integrations/google-drive/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
        return reply.redirect(`${frontendUrl()}/?error=drive_token_failed`);
      }

      const tokenData = (await tokenRes.json()) as { refresh_token?: string };

      if (tokenData.refresh_token) {
        await updateSettings(request.ownerId, {
          driveRefreshToken: tokenData.refresh_token,
        });
      }

      return reply.redirect(frontendUrl());
    },
  );
});
