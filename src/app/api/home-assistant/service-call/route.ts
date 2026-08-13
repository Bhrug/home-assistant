export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { members, type MemberId } from "@/data/household";
import { getLiveEntities, setLiveEntityState } from "@/lib/home-assistant/connections";
import { scopeLiveEntities } from "@/lib/home-assistant/scope";

interface ServiceCallBody {
  memberId: MemberId;
  entityId: string;
  state: string;
  attributes?: Record<string, unknown>;
}

// Mirrors src/app/api/voice/route.ts's scope-before-action pattern: the
// entity must both be within this member's scoped area allow-list and
// marked canControl before we ever call Home Assistant.
export async function POST(request: Request) {
  let body: ServiceCallBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { memberId, entityId, state, attributes } = body;
  const member = members.find((item) => item.id === memberId);
  if (!member || !entityId || !state) {
    return NextResponse.json({ error: "Missing memberId, entityId or state" }, { status: 400 });
  }

  const entities = await getLiveEntities(member.id);
  if (!entities) {
    return NextResponse.json({ error: "Not connected to Home Assistant" }, { status: 409 });
  }

  const scoped = await scopeLiveEntities(member, entities);
  const entity = scoped.find((item) => item.entityId === entityId);
  if (!entity) {
    return NextResponse.json({ error: `${entityId} is not available to this person` }, { status: 403 });
  }
  if (!entity.canControl) {
    return NextResponse.json({ error: `${entity.name} cannot be controlled` }, { status: 403 });
  }

  try {
    await setLiveEntityState(member.id, entityId, state, attributes ?? {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Home Assistant service call failed", error);
    return NextResponse.json({ error: "Home Assistant service call failed" }, { status: 502 });
  }
}
