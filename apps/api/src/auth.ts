/**
 * @file auth.ts
 * @description Bearer-token authentication plugin that verifies JWS session tokens and attaches the authenticated ownerId to every request.
 * @architecture Injects ownerId into the request via an AsyncLocalStorage tenant context.
 */

import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";
import { tenantContext } from "./db.js";
import "./types.js";

/**
 * @desc    Verify a bearer token using standard JWS signature verification
 * @param   {string} token - The raw bearer token extracted from the Authorization header
 * @param   {string} secret - The shared secret used for verification/decryption
 * @returns {Promise<object>} The decoded token payload
 */
export async function verifyToken(token: string, secret: string) {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { clockTolerance: 30 });
  return payload;
}

/**
 * @module authPlugin
 * @description Fastify plugin that guards every route with bearer-token authentication and seeds the tenant context.
 */
export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest("ownerId", "");

  // We set up the context in onRequest so it wraps the entire request lifecycle.
  // Then we authenticate and mutate the store in preHandler.

  /**
   * @desc    Scoped-request hook that initializes the AsyncLocalStorage tenant context
   */
  fastify.addHook("onRequest", (request, reply, done) => {
    tenantContext.run({ ownerId: "" }, () => {
      done();
    });
  });

  /**
   * @desc    Request guard that validates the Bearer token and assigns ownerId to the request and tenant context
   */
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Extract the matched route path (e.g. "/api/auth/google"), falling back to parsed url path with duplicate slashes collapsed
      const rawUrl = request.url.split("?")[0].replace(/\/\/+/g, "/");
      const routeUrl = request.routeOptions?.url || rawUrl;

      // Public routes — skip auth entirely
      if (routeUrl === "/health" || routeUrl.startsWith("/api/auth/")) {
        return;
      }

      const authHeader = request.headers.authorization;
      let token = "";

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (request.headers.cookie) {
        const cookieHeader = request.headers.cookie;
        const cookieNames = ["nexus-session"];

        for (const name of cookieNames) {
          const match = cookieHeader.match(
            new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
          );
          if (match && match[1]) {
            token = match[1];
            break;
          }
        }
      }

      if (!token) {
        return reply
          .status(401)
          .send({ error: "Unauthorized: Missing or invalid token" });
      }
      const secret = process.env.AUTH_SECRET;

      if (!secret) {
        request.log.error("AUTH_SECRET is not configured.");
        return reply.status(500).send({ error: "Internal Server Error" });
      }

      try {
        const payload = await verifyToken(token, secret);
        const ownerId = payload.sub;

        if (!ownerId) {
          return reply
            .status(401)
            .send({ error: "Unauthorized: Missing sub in token" });
        }

        request.ownerId = ownerId;

        const store = tenantContext.getStore();
        if (store) {
          store.ownerId = ownerId;
        }
      } catch (err) {
        request.log.error(err, "Token validation failed");
        return reply.status(401).send({ error: "Unauthorized: Invalid token" });
      }
    },
  );
});
