/**
 * @file oauth.ts
 * @description Generic OAuth2 utilities for managing state, cookies, and token exchange.
 * @architecture Provides stateless session management helpers and HTTP wrappers for standard OAuth2 flows.
 */
import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

/**
 * @desc    Get the frontend base URL from environment or default
 * @returns {string} The frontend URL without trailing slash
 */
export const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * @desc    Generate standard cookie options (HttpOnly, SameSite, Secure if HTTPS)
 * @returns {string} The cookie options string
 */
export const cookieOptions = () =>
  `HttpOnly; ${frontendUrl().startsWith("https://") ? "Secure; " : ""}SameSite=Lax; Path=/`;

/**
 * @desc    Generate a random 16-byte hex string for OAuth state validation
 * @returns {string} Random state string
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * @desc    Set an HTTP-only state cookie on the Fastify reply
 * @param   {import("fastify").FastifyReply} reply - Fastify reply object
 * @param   {string} cookieName - Name of the cookie
 * @param   {string} state - The state string to store
 * @param   {number} [maxAge=300] - Cookie max age in seconds (default 5 mins)
 */
export function setStateCookie(
  reply: FastifyReply,
  cookieName: string,
  state: string,
  maxAge = 300,
) {
  reply.header(
    "Set-Cookie",
    `${cookieName}=${state}; ${cookieOptions()}; Max-Age=${maxAge}`,
  );
}

/**
 * @desc    Extract a specific cookie value from the request headers manually
 * @param   {import("fastify").FastifyRequest} request - Fastify request object
 * @param   {string} cookieName - Name of the cookie to extract
 * @returns {string|null} The cookie value, or null if not found
 */
export function getStateFromCookie(
  request: FastifyRequest,
  cookieName: string,
): string | null {
  const cookieHeader = request.headers.cookie ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`),
  );
  return match?.[1] ?? null;
}

/**
 * @desc    Clear an existing state cookie by setting its max age to 0
 * @param   {import("fastify").FastifyReply} reply - Fastify reply object
 * @param   {string} cookieName - Name of the cookie to clear
 */
export function clearStateCookie(reply: FastifyReply, cookieName: string) {
  reply.header("Set-Cookie", `${cookieName}=; ${cookieOptions()}; Max-Age=0`);
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
