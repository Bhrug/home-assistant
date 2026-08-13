export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { buildAuthorizeUrl } from "@/lib/home-assistant/oauth";
import { getPendingAuthStore } from "@/lib/home-assistant/pending-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") as MemberId | null;
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }

  const state = getPendingAuthStore().create(member.id);
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
