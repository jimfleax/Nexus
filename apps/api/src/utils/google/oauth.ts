/**
 * @file oauth.ts
 * @description Google OAuth2 client builder utilities.
 * @architecture Encapsulates the Google API client instantiation and credentials hydration using environment variables and user tokens.
 */
import { google } from "googleapis";

/**
 * Build a per-user authenticated Google OAuth2 client from the shared app
 * credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET) plus the user's stored
 * Drive refresh token. Throws if the app or user credentials are missing.
 */
export function buildOAuthClient(refreshToken: string) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Auth not configured");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}
