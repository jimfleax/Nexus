/**
 * @file oauth.ts
 * @description Generic OAuth2 utilities for managing token exchange and basic helpers.
 */
import crypto from "node:crypto";

/**
 * @desc    Get the frontend base URL from environment or default
 * @returns {string} The frontend URL without trailing slash
 */
export const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * @desc    Generate a random 16-byte hex string for OAuth state validation
 * @returns {string} Random state string
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * @desc    POST form-encoded credentials to a provider token endpoint.
 * @param   {string} tokenUrl - Provider's token endpoint URL
 * @param   {Object} params - Token exchange parameters (code, client_id, etc.)
 * @param   {Record<string, string>} [extraHeaders={}] - Additional request headers
 * @returns {Promise<Response>} Fetch Response object
 */
export async function exchangeCodeForToken(
  tokenUrl: string,
  params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    [key: string]: string;
  },
  extraHeaders: Record<string, string> = {},
) {
  const { clientId, clientSecret, redirectUri, ...rest } = params;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders,
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      ...rest,
    }),
  });
  return res;
}
