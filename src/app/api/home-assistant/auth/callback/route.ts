export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/home-assistant/oauth";
import { getPendingAuthStore } from "@/lib/home-assistant/pending-auth";
import { getHomeAssistantStore } from "@/lib/home-assistant/store";
import { resetLiveConnection } from "@/lib/home-assistant/connections";

// Hearth has no persisted session today (a page reload always returns to
// the PIN screen), so this always redirects to "/" — the person will need
// to sign back in with their PIN, at which point the dashboard picks up
// the now-connected status automatically.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = new URL("/", url.origin);

  if (!code || !state) {
    return NextResponse.redirect(appUrl);
  }

  const memberId = getPendingAuthStore().consume(state);
  if (!memberId) {
    return NextResponse.redirect(appUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await getHomeAssistantStore().saveTokens(memberId, tokens);
    resetLiveConnection(memberId);
  } catch (error) {
    console.error("Home Assistant token exchange failed", error);
  }

  return NextResponse.redirect(appUrl);
}
