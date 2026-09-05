/**
 * @file types.ts
 * @description Shared contracts and types for the OAuth authentication layer.
 * @architecture Defines the IOAuthProvider interface and shared data structures used across various provider implementations.
 */

/**
 * @desc    Standard OAuth token response containing access and optional refresh tokens
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * @desc    Normalized user identity data retrieved from an OAuth provider
 */
export interface OAuthIdentity {
  id: string; // e.g., 'google_12345'
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * @desc    Interface defining the required methods for any OAuth provider integration
 */
export interface IOAuthProvider {
  getAuthorizationUrl(
    state: string,
    redirectUri: string,
    scopes?: string[],
  ): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;
  getIdentity(accessToken: string): Promise<OAuthIdentity>;
  buildAuthedClient(refreshToken: string): any;
  revokeConnection(refreshToken: string): Promise<void>;
}

export class OAuthExchangeError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OAuthExchangeError";
  }
}

export class OAuthProfileError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OAuthProfileError";
  }
}
