export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface OAuthIdentity {
  id: string; // e.g., 'google_12345'
  email: string | null;
  name: string | null;
  image: string | null;
}

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
