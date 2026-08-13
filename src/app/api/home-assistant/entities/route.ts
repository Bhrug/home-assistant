export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { getLiveEntities } from "@/lib/home-assistant/connections";
import { scopeLiveEntities } from "@/lib/home-assistant/scope";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") as MemberId | null;
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }

  const entities = await getLiveEntities(member.id);
  if (!entities) {
    return NextResponse.json({ error: "Not connected to Home Assistant" }, { status: 409 });
  }

  const scoped = await scopeLiveEntities(member, entities);
  return NextResponse.json({ entities: scoped });
}
