import {
  IOAuthProvider,
  OAuthIdentity,
  OAuthTokens,
  OAuthExchangeError,
  OAuthProfileError,
} from "./types.js";
import { google } from "googleapis";

export interface GoogleAppCredentials {
  clientId: string;
  clientSecret: string;
}

export function buildGoogleAuthClient(
  refreshToken: string,
  { clientId, clientSecret }: GoogleAppCredentials,
) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Exchange an OAuth code using the provider, persist the refresh token when one
 * is issued, and fetch the user's identity. Shared by the login and Drive-connect
 * flows so both trust the same post-code orchestration.
 */
export async function authorizeWithGoogle(
  provider: Pick<IOAuthProvider, "exchangeCode" | "getIdentity">,
  code: string,
  redirectUri: string,
  persistRefreshToken: (
    refreshToken: string,
    identity: OAuthIdentity,
  ) => Promise<unknown>,
): Promise<{ tokens: OAuthTokens; identity: OAuthIdentity }> {
  const tokens = await provider.exchangeCode(code, redirectUri);
  const identity = await provider.getIdentity(tokens.accessToken);
  if (tokens.refreshToken) {
    await persistRefreshToken(tokens.refreshToken, identity);
  }
  return { tokens, identity };
}

export class GoogleOAuthProvider implements IOAuthProvider {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  getAuthorizationUrl(
    state: string,
    redirectUri: string,
    scopes: string[] = [],
  ): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      prompt: "consent",
      access_type: "offline",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new OAuthExchangeError(
        `Google token exchange failed: ${errBody}`,
        res.status,
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async getIdentity(accessToken: string): Promise<OAuthIdentity> {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new OAuthProfileError(`Google userinfo fetch failed`, res.status);
    }

    const data = (await res.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    return {
      id: `google_${data.sub}`,
      email: data.email ?? null,
      name: data.name ?? null,
      image: data.picture ?? null,
    };
  }

  buildAuthedClient(refreshToken: string) {
    return buildGoogleAuthClient(refreshToken, {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  async revokeConnection(refreshToken: string) {
    const oauth2Client = this.buildAuthedClient(refreshToken);
    await oauth2Client.revokeToken(refreshToken);
  }
}
