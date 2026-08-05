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
