export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { isMemberConnected } from "@/lib/home-assistant/connections";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") as MemberId | null;
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }

  const connected = await isMemberConnected(member.id);
  return NextResponse.json({ connected });
}
