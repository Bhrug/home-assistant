import type { HomeAssistantTokens } from "./store";

export function getHomeAssistantUrl(): string {
  const url = process.env.HOME_ASSISTANT_URL;
  if (!url) throw new Error("HOME_ASSISTANT_URL is not configured");
  return url.replace(/\/$/, "");
}

function getHearthBaseUrl(): string {
  const url = process.env.HEARTH_BASE_URL;
  if (!url) throw new Error("HEARTH_BASE_URL is not configured");
  return url.replace(/\/$/, "");
}

// Home Assistant's auth flow needs no client registration when the client
// id is the app's own origin and the redirect uri shares that origin.
export function getClientId(): string {
  return `${getHearthBaseUrl()}/`;
}

export function getRedirectUri(): string {
  return `${getHearthBaseUrl()}/api/home-assistant/auth/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const url = new URL(`${getHomeAssistantUrl()}/auth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<HomeAssistantTokens> {
  const hassUrl = getHomeAssistantUrl();
  const clientId = getClientId();
  const response = await fetch(`${hassUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Home Assistant token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as TokenResponse;
  return {
    hassUrl,
    clientId,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires: Date.now() + data.expires_in * 1000,
  };
}
