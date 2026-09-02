import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

export const frontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

export const cookieOptions = () =>
  `HttpOnly; ${frontendUrl().startsWith("https://") ? "Secure; " : ""}SameSite=Lax; Path=/`;

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

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

export function clearStateCookie(reply: FastifyReply, cookieName: string) {
  reply.header("Set-Cookie", `${cookieName}=; ${cookieOptions()}; Max-Age=0`);
}

/** POST form-encoded credentials to a provider token endpoint. Returns the parsed JSON. */
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
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...extraHeaders,
    },
    body: new URLSearchParams({ ...(params as any) }),
  });
  return res;
}
