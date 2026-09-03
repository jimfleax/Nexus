import { FastifyReply, FastifyRequest } from "fastify";

const OAUTH_STATE_COOKIE = "oauth_state";
const INTEGRATION_STATE_COOKIE = "integration_state";
const SESSION_COOKIE = "nexus-session";

function getCookieOptions() {
  const apiUrl = process.env.API_URL || "http://localhost:8080";
  return {
    httpOnly: true,
    secure: apiUrl.startsWith("https://"),
    sameSite: "none" as const,
    path: "/",
  };
}

export const SessionManager = {
  getAuthToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Fall back to cookie. Note: @fastify/cookie decorates request.cookies
    if (request.cookies && request.cookies[SESSION_COOKIE]) {
      return request.cookies[SESSION_COOKIE];
    }

    return null;
  },

  setOAuthState(reply: FastifyReply, state: string) {
    reply.cookie(OAUTH_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },

  getOAuthState(request: FastifyRequest): string | null {
    return request.cookies ? request.cookies[OAUTH_STATE_COOKIE] || null : null;
  },

  clearOAuthState(reply: FastifyReply) {
    reply.clearCookie(OAUTH_STATE_COOKIE, getCookieOptions());
  },

  setIntegrationState(reply: FastifyReply, state: string) {
    reply.cookie(INTEGRATION_STATE_COOKIE, state, {
      ...getCookieOptions(),
      maxAge: 300,
    });
  },

  getIntegrationState(request: FastifyRequest): string | null {
    return request.cookies
      ? request.cookies[INTEGRATION_STATE_COOKIE] || null
      : null;
  },

  clearIntegrationState(reply: FastifyReply) {
    reply.clearCookie(INTEGRATION_STATE_COOKIE, getCookieOptions());
  },
};
