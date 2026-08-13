export type MemberId = "you" | "lops" | "anni" | "yuvi";
export type MemberRole = "owner" | "adult" | "child";

export interface HouseholdMember {
  id: MemberId;
  name: string;
  initials: string;
  role: MemberRole;
  primaryArea: string;
  greeting: string;
  accent: string;
  avatarClass: string;
  pin: string;
}

export interface Area {
  id: string;
  name: string;
  floor: string;
  icon: "bed" | "sofa" | "utensils" | "home";
  temperature: number;
  activeDevices: number;
}

// Placeholder PINs — change these before real use. This is a lightweight
// deterrent against casual profile-switching, not real security: it lives
// in client-side JS and is not a substitute for Home Assistant's own
// per-user authentication once the real adapter is connected.
export const members: HouseholdMember[] = [
  { id: "yuvi", name: "Yuvi", initials: "Y", role: "child", primaryArea: "yuvi-bedroom", greeting: "Your room is cosy and everything looks good.", accent: "#6c63e8", avatarClass: "avatarYuvi", pin: "1111" },
  { id: "you", name: "Bhrug", initials: "B", role: "owner", primaryArea: "main-bedroom", greeting: "The house is settled and running smoothly.", accent: "#28756b", avatarClass: "avatarYou", pin: "4444" },
  { id: "lops", name: "Lops", initials: "L", role: "adult", primaryArea: "main-bedroom", greeting: "Everything at home is just where you left it.", accent: "#b45f75", avatarClass: "avatarLops", pin: "3333" },
  { id: "anni", name: "Anni", initials: "A", role: "child", primaryArea: "anni-bedroom", greeting: "Your space is ready for you.", accent: "#d37942", avatarClass: "avatarAnni", pin: "2222" },
];

export const areas: Area[] = [
  { id: "yuvi-bedroom", name: "Yuvi’s room", floor: "Upstairs", icon: "bed", temperature: 20.5, activeDevices: 3 },
  { id: "living-room", name: "Living room", floor: "Downstairs", icon: "sofa", temperature: 21, activeDevices: 4 },
  { id: "kitchen", name: "Kitchen", floor: "Downstairs", icon: "utensils", temperature: 20, activeDevices: 2 },
  { id: "anni-bedroom", name: "Anni’s room", floor: "Upstairs", icon: "bed", temperature: 20, activeDevices: 2 },
  { id: "main-bedroom", name: "Main bedroom", floor: "Upstairs", icon: "bed", temperature: 19.5, activeDevices: 2 },
];

export const routines = [
  { id: "focus", name: "Focus time", detail: "Lights bright · Alexa quiet", icon: "sparkles" as const },
  { id: "relax", name: "Relax", detail: "Warm lights · Favourite playlist", icon: "headphones" as const },
  { id: "bedtime", name: "Bedtime", detail: "Everything off · Heating 18°", icon: "moon" as const },
];

const sharedAreaIds = ["living-room", "kitchen"];

// Children can see/control their own room plus shared household areas.
// Adults and the owner can reach every area. This is enforced server-side
// (see src/app/api/voice/route.ts) so a person can never ask their way
// around it via conversation. Mock-mode only: these are the mock adapter's
// own literal area ids, which never exist in a real Home Assistant instance.
export function allowedAreaIdsFor(member: HouseholdMember): string[] {
  if (member.role === "child") {
    return [member.primaryArea, ...sharedAreaIds];
  }
  return areas.map((area) => area.id);
}

// Live-mode equivalent of allowedAreaIdsFor, used once a member is connected
// to a real Home Assistant instance. Real area ids are discovered from HA
// itself (see src/lib/home-assistant/connections.ts's getLiveAreas) rather
// than the mock literals above, and each member's primary room is whatever
// they picked in the room-mapping picker (src/app/api/home-assistant/room-mapping).
//
// Adults/owner: null means unrestricted — each person now authenticates
// with their own Home Assistant user, so HA's own per-user permissions are
// the real security boundary, not this allow-list.
//
// Child: their mapped primary room, plus every live area nobody else has
// claimed as their primary room (a zero-config stand-in for "shared areas"
// since a fresh Home Assistant instance has no equivalent of sharedAreaIds).
export function allowedLiveAreaIdsFor(
  member: HouseholdMember,
  liveAreaIds: string[],
  roomMapping: Partial<Record<MemberId, string>>
): string[] | null {
  if (member.role !== "child") return null;

  const mappedPrimaryAreaId = roomMapping[member.id] ?? null;
  const claimedByOthers = new Set(
    Object.entries(roomMapping)
      .filter(([id]) => id !== member.id)
      .map(([, areaId]) => areaId)
  );
  const areaIds = liveAreaIds.filter((areaId) => !claimedByOthers.has(areaId));
  return mappedPrimaryAreaId && !areaIds.includes(mappedPrimaryAreaId) ? [...areaIds, mappedPrimaryAreaId] : areaIds;
}
