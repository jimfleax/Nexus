/**
 * @file oauthProvider.ts
 * @description Fastify plugin that registers and provides OAuth providers for the application.
 * @architecture Decorates the Fastify instance with an `oauth` object to manage and retrieve OAuth providers like Google.
 */
import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { IOAuthProvider } from "../utils/oauth/types.js";
import { GoogleOAuthProvider } from "../utils/oauth/google.js";

declare module "fastify" {
  interface FastifyInstance {
    oauth: {
      getProvider(name: string): IOAuthProvider;
      registerProvider(name: string, provider: IOAuthProvider): void;
    };
  }
}

/**
 * @plugin oauthProviderPlugin
 * @description Registers OAuth providers and decorates the Fastify instance with OAuth management methods.
 */
export const oauthProviderPlugin: FastifyPluginAsync = fp(
  async (fastify) => {
    const providers = new Map<string, IOAuthProvider>();

    const googleId = process.env.AUTH_GOOGLE_ID;
    const googleSecret = process.env.AUTH_GOOGLE_SECRET;

    if (googleId && googleSecret) {
      providers.set("google", new GoogleOAuthProvider(googleId, googleSecret));
    }

    fastify.decorate("oauth", {
      getProvider(name: string) {
        const provider = providers.get(name);
        if (!provider) {
          throw new Error(
            `OAuth provider '${name}' not found or not configured`,
          );
        }
        return provider;
      },
      registerProvider(name: string, provider: IOAuthProvider) {
        providers.set(name, provider);
      },
    });
  },
  { name: "oauth-provider-plugin" },
);
