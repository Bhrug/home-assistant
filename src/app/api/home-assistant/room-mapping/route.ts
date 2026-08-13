export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { getLiveAreas } from "@/lib/home-assistant/connections";
import { getHomeAssistantStore } from "@/lib/home-assistant/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId") as MemberId | null;
  const member = members.find((item) => item.id === memberId);
  if (!member) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }

  const [areas, mappedAreaId] = await Promise.all([
    getLiveAreas(member.id),
    getHomeAssistantStore().getRoomMapping(member.id),
  ]);
  return NextResponse.json({ areas, mappedAreaId });
}

interface RoomMappingBody {
  memberId: MemberId;
  areaId: string;
}

export async function POST(request: Request) {
  let body: RoomMappingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const member = members.find((item) => item.id === body.memberId);
  if (!member || !body.areaId) {
    return NextResponse.json({ error: "Missing memberId or areaId" }, { status: 400 });
  }

  const areas = await getLiveAreas(member.id);
  if (!areas.some((area) => area.areaId === body.areaId)) {
    return NextResponse.json({ error: "Unknown area for this person's Home Assistant instance" }, { status: 400 });
  }

  await getHomeAssistantStore().setRoomMapping(member.id, body.areaId);
  return NextResponse.json({ ok: true });
}
