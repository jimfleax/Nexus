/**
 * @file session.ts
 * @description Manages session tokens and OAuth states using cookies and headers.
 * @architecture Acts as the central utility for managing authentication state and security tokens in HTTP requests/responses.
 */
import { FastifyReply, FastifyRequest } from "fastify";

const OAUTH_STATE_COOKIE = "oauth_state";
const INTEGRATION_STATE_COOKIE = "integration_state";
const SESSION_COOKIE = "nexus-session";

/**
 * @desc    Generates standard security options for backend cookies.
 *
 * @warning CRITICAL OAUTH COOKIE LOGIC
 *          The `sameSite` policy MUST be set to "lax", NOT "none".
 *          During the OAuth flow, the browser is redirected from Google (accounts.google.com)
 *          back to this API backend. Because of aggressive third-party cookie blocking in
 *          modern browsers (like Chrome), a `SameSite=None` cookie will often be silently dropped
 *          during this cross-site redirect, resulting in an `auth_failed_state` error.
 *          A `SameSite=Lax` cookie is safely permitted because the Google callback is a top-level GET navigation.
 */
function getCookieOptions() {
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  return {
    httpOnly: true,
    secure: apiUrl.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
  };
}

export const SessionManager = {
  /**
   * @desc Extracts the authentication token from the request headers, cookies, or query parameters.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The extracted token or null if not found.
   */
  getAuthToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Fall back to cookie. Note: @fastify/cookie decorates request.cookies
    if (request.cookies && request.cookies[SESSION_COOKIE]) {
      return request.cookies[SESSION_COOKIE];
    }

    // Fall back to query parameter for cross-origin OAuth initiations
    const query = request.query as Record<string, string>;
    if (query && query.token) {
      return query.token;
    }

    return null;
  },

  /**
   * @desc Sets the OAuth state cookie in the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @param {string} state - The OAuth state string to set.
   * @returns {void}
   */
  setOAuthState(reply: FastifyReply, state: string) {
    reply.cookie(OAUTH_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },

  /**
   * @desc Retrieves the OAuth state from the request cookies.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The OAuth state or null if not found.
   */
  getOAuthState(request: FastifyRequest): string | null {
    return request.cookies ? request.cookies[OAUTH_STATE_COOKIE] || null : null;
  },

  /**
   * @desc Clears the OAuth state cookie from the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @returns {void}
   */
  clearOAuthState(reply: FastifyReply) {
    reply.clearCookie(OAUTH_STATE_COOKIE, getCookieOptions());
  },

  /**
   * @desc Sets the integration state cookie in the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @param {string} state - The integration state string to set.
   * @returns {void}
   */
  setIntegrationState(reply: FastifyReply, state: string) {
    reply.cookie(INTEGRATION_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },

  /**
   * @desc Retrieves the integration state from the request cookies.
   * @param {FastifyRequest} request - The Fastify request object.
   * @returns {string | null} The integration state or null if not found.
   */
  getIntegrationState(request: FastifyRequest): string | null {
    return request.cookies
      ? request.cookies[INTEGRATION_STATE_COOKIE] || null
      : null;
  },

  /**
   * @desc Clears the integration state cookie from the response.
   * @param {FastifyReply} reply - The Fastify reply object.
   * @returns {void}
   */
  clearIntegrationState(reply: FastifyReply) {
    reply.clearCookie(INTEGRATION_STATE_COOKIE, getCookieOptions());
  },
};
