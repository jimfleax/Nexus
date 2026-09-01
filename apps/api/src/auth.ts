/**
 * @file auth.ts
 * @description Bearer-token authentication plugin that verifies JWS/JWE session tokens and attaches the authenticated ownerId to every request.
 * @architecture Injects ownerId into the request via an AsyncLocalStorage tenant context, supporting both raw JWS verification and Auth.js/NextAuth session-token decryption as a fallback.
 */

import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify, jwtDecrypt } from "jose";
import { hkdf } from "node:crypto";
import { promisify } from "node:util";
import { tenantContext } from "./db.js";

const hkdfAsync = promisify(hkdf);

/**
 * @desc    Derive the decryption key used for Auth.js encrypted session tokens via HKDF
 * @param   {string} secret - The Auth.js secret from which the key is derived
 * @param   {string} salt - The cookie-name-derived HKDF salt
 * @returns {Promise<Uint8Array>} The 64-byte HKDF-generated encryption key
 */
async function getNextAuthKey(secret: string, salt: string) {
  const buffer = await hkdfAsync(
    "sha256",
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64,
  );
  return new Uint8Array(buffer);
}

/**
 * @desc    Verify a bearer token, trying standard JWS signature verification first and falling back to Auth.js JWE cookie decryption
 * @param   {string} token - The raw bearer token extracted from the Authorization header
 * @param   {string} secret - The shared secret used for verification/decryption
 * @returns {Promise<object>} The decoded token payload
 */
export async function verifyToken(token: string, secret: string) {
  try {
    // First try standard JWS signature verification
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (err) {
    // Fallback: try NextAuth JWE decryption
    const salts = [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ];
    for (const salt of salts) {
      try {
        const key = await getNextAuthKey(secret, salt);
        const { payload } = await jwtDecrypt(token, key);
        return payload;
      } catch (_e2) {
        // Ignore and try next salt
      }
    }
    // If all fail, throw the original verification error
    throw err;
  }
}

/**
 * @module authPlugin
 * @description Fastify plugin that guards every route with bearer-token authentication and seeds the tenant context.
 */
export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest("ownerId", null);

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
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply
          .status(401)
          .send({ error: "Unauthorized: Missing or invalid token" });
      }

      const token = authHeader.substring(7);
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

        (request as any).ownerId = ownerId;

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
