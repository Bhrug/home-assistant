import { allowedLiveAreaIdsFor, type HouseholdMember } from "@/data/household";
import { getLiveAreas } from "./connections";
import { getHomeAssistantStore } from "./store";
import type { HomeEntity } from "./types";

// Shared by the entities and stream routes so both apply the same
// server-side scoping before any live data reaches the browser — the same
// scope-before-action pattern src/app/api/voice/route.ts uses.
export async function scopeLiveEntities(member: HouseholdMember, entities: HomeEntity[]): Promise<HomeEntity[]> {
  const [liveAreas, roomMapping] = await Promise.all([
    getLiveAreas(member.id),
    getHomeAssistantStore().getAllRoomMappings(),
  ]);
  const allowedAreaIds = allowedLiveAreaIdsFor(
    member,
    liveAreas.map((area) => area.areaId),
    roomMapping
  );
  if (allowedAreaIds === null) return entities;
  const allowed = new Set(allowedAreaIds);
  return entities.filter((entity) => allowed.has(entity.areaId));
}
