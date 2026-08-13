import {
  Auth,
  createConnection,
  getStates,
  callService as haCallService,
  subscribeEntities,
  type Connection,
  type HassEntity,
} from "home-assistant-js-websocket";
import type { MemberId } from "@/data/household";
import type { HomeEntity } from "./types";
import { getHomeAssistantStore } from "./store";

// home-assistant-js-websocket expects a browser-style global WebSocket.
// This is the library's documented Node usage pattern.
let polyfillPromise: Promise<void> | null = null;
function ensureWebSocketPolyfill(): Promise<void> {
  if (!polyfillPromise) {
    polyfillPromise = import("ws").then((mod) => {
      if (typeof globalThis.WebSocket === "undefined") {
        globalThis.WebSocket = (mod.default ?? mod) as unknown as typeof WebSocket;
      }
    });
  }
  return polyfillPromise;
}

const CONTROLLABLE_DOMAINS = new Set(["media_player", "climate", "light", "switch", "lock", "cover"]);

interface EntityRegistryEntry {
  entity_id: string;
  device_id: string | null;
  area_id: string | null;
}
interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
}
interface AreaRegistryEntry {
  area_id: string;
  name: string;
}

interface RegistrySnapshot {
  fetchedAt: number;
  areas: AreaRegistryEntry[];
  entityInfo: Map<string, { areaId: string | null; deviceId: string | null }>;
}

const REGISTRY_TTL_MS = 30 * 60 * 1000;

async function fetchRegistrySnapshot(conn: Connection): Promise<RegistrySnapshot> {
  const [entityRegistry, deviceRegistry, areaRegistry] = await Promise.all([
    conn.sendMessagePromise<EntityRegistryEntry[]>({ type: "config/entity_registry/list" }),
    conn.sendMessagePromise<DeviceRegistryEntry[]>({ type: "config/device_registry/list" }),
    conn.sendMessagePromise<AreaRegistryEntry[]>({ type: "config/area_registry/list" }),
  ]);
  const deviceAreaById = new Map(deviceRegistry.map((device) => [device.id, device.area_id]));
  const entityInfo = new Map<string, { areaId: string | null; deviceId: string | null }>();
  for (const entry of entityRegistry) {
    const areaId = entry.area_id ?? (entry.device_id ? (deviceAreaById.get(entry.device_id) ?? null) : null);
    entityInfo.set(entry.entity_id, { areaId, deviceId: entry.device_id });
  }
  return { fetchedAt: Date.now(), areas: areaRegistry, entityInfo };
}

function mapHassEntity(entity: HassEntity, registry: RegistrySnapshot): HomeEntity {
  const domain = entity.entity_id.split(".")[0];
  const info = registry.entityInfo.get(entity.entity_id);
  return {
    entityId: entity.entity_id,
    deviceId: info?.deviceId ?? entity.entity_id,
    areaId: info?.areaId ?? "unassigned",
    domain,
    name: String(entity.attributes.friendly_name ?? entity.entity_id),
    state: entity.state,
    attributes: entity.attributes,
    canControl: CONTROLLABLE_DOMAINS.has(domain),
  };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

async function applyServiceForEntity(
  conn: Connection,
  entity: HassEntity,
  desiredState: string,
  attributes: Record<string, unknown>
): Promise<void> {
  const domain = entity.entity_id.split(".")[0];
  const target = { entity_id: entity.entity_id };

  switch (domain) {
    case "media_player": {
      if (typeof attributes.volume === "number") {
        await haCallService(conn, "media_player", "volume_set", { volume_level: clampPercent(attributes.volume) / 100 }, target);
      }
      if (desiredState === "playing") {
        await haCallService(conn, "media_player", "media_play", {}, target);
      } else if (desiredState === "paused") {
        await haCallService(conn, "media_player", "media_pause", {}, target);
      }
      return;
    }
    case "climate": {
      if (typeof attributes.temperature === "number") {
        await haCallService(conn, "climate", "set_temperature", { temperature: attributes.temperature }, target);
      }
      if (desiredState && desiredState !== entity.state) {
        await haCallService(conn, "climate", "set_hvac_mode", { hvac_mode: desiredState }, target);
      }
      return;
    }
    case "light": {
      if (desiredState === "off") {
        await haCallService(conn, "light", "turn_off", {}, target);
        return;
      }
      const serviceData: Record<string, unknown> = {};
      if (typeof attributes.brightness === "number") {
        serviceData.brightness_pct = Math.round(clampPercent(attributes.brightness));
      }
      await haCallService(conn, "light", "turn_on", serviceData, target);
      return;
    }
    case "switch": {
      await haCallService(conn, "switch", desiredState === "off" ? "turn_off" : "turn_on", {}, target);
      return;
    }
    case "lock": {
      await haCallService(conn, "lock", desiredState === "unlocked" ? "unlock" : "lock", {}, target);
      return;
    }
    case "cover": {
      await haCallService(conn, "cover", desiredState === "closed" ? "close_cover" : "open_cover", {}, target);
      return;
    }
    default:
      throw new Error(`Entity domain "${domain}" is not controllable`);
  }
}

interface ConnectionCacheEntry {
  connectionPromise: Promise<Connection>;
  registry: RegistrySnapshot | null;
  registryPromise: Promise<RegistrySnapshot> | null;
}

declare global {
  var __hearthHaConnections: Map<MemberId, ConnectionCacheEntry> | undefined;
}

function getConnectionsMap(): Map<MemberId, ConnectionCacheEntry> {
  if (!globalThis.__hearthHaConnections) {
    globalThis.__hearthHaConnections = new Map();
  }
  return globalThis.__hearthHaConnections;
}

async function connectForMember(memberId: MemberId): Promise<Connection> {
  await ensureWebSocketPolyfill();
  const store = getHomeAssistantStore();
  const tokens = await store.getTokens(memberId);
  if (!tokens) throw new Error(`No stored Home Assistant tokens for ${memberId}`);

  const auth = new Auth(
    {
      hassUrl: tokens.hassUrl,
      clientId: tokens.clientId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires: tokens.expires,
      expires_in: tokens.expires_in,
    },
    (data) => {
      if (!data) return;
      void store.saveTokens(memberId, {
        hassUrl: data.hassUrl,
        clientId: data.clientId ?? tokens.clientId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires: data.expires,
        expires_in: data.expires_in,
      });
    }
  );

  return createConnection({ auth });
}

function getOrCreateConnection(memberId: MemberId): Promise<Connection> {
  const map = getConnectionsMap();
  const existing = map.get(memberId);
  if (existing) return existing.connectionPromise;

  const connectionPromise = connectForMember(memberId).catch((error) => {
    map.delete(memberId);
    throw error;
  });
  map.set(memberId, { connectionPromise, registry: null, registryPromise: null });
  return connectionPromise;
}

async function getRegistry(memberId: MemberId, conn: Connection): Promise<RegistrySnapshot> {
  const entry = getConnectionsMap().get(memberId);
  if (!entry) throw new Error(`No connection cache entry for ${memberId}`);

  const isStale = !entry.registry || Date.now() - entry.registry.fetchedAt > REGISTRY_TTL_MS;
  if (isStale && !entry.registryPromise) {
    entry.registryPromise = fetchRegistrySnapshot(conn);
  }
  if (entry.registryPromise) {
    entry.registry = await entry.registryPromise;
    entry.registryPromise = null;
  }
  return entry.registry!;
}

export function resetLiveConnection(memberId: MemberId): void {
  getConnectionsMap().delete(memberId);
}

export async function isMemberConnected(memberId: MemberId): Promise<boolean> {
  const store = getHomeAssistantStore();
  const tokens = await store.getTokens(memberId);
  if (!tokens) return false;
  try {
    const conn = await getOrCreateConnection(memberId);
    return conn.connected;
  } catch {
    return false;
  }
}

export async function getLiveEntities(memberId: MemberId): Promise<HomeEntity[] | null> {
  const store = getHomeAssistantStore();
  if (!(await store.getTokens(memberId))) return null;
  const conn = await getOrCreateConnection(memberId);
  const [states, registry] = await Promise.all([getStates(conn), getRegistry(memberId, conn)]);
  return states.map((state) => mapHassEntity(state, registry));
}

export async function subscribeLiveEntities(
  memberId: MemberId,
  onChange: (entities: HomeEntity[]) => void
): Promise<(() => void) | null> {
  const store = getHomeAssistantStore();
  if (!(await store.getTokens(memberId))) return null;
  const conn = await getOrCreateConnection(memberId);
  const registry = await getRegistry(memberId, conn);
  return subscribeEntities(conn, (hassEntities) => {
    onChange(Object.values(hassEntities).map((state) => mapHassEntity(state, registry)));
  });
}

export async function setLiveEntityState(
  memberId: MemberId,
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): Promise<void> {
  const conn = await getOrCreateConnection(memberId);
  const states = await getStates(conn);
  const entity = states.find((item) => item.entity_id === entityId);
  if (!entity) throw new Error(`Unknown entity ${entityId}`);
  await applyServiceForEntity(conn, entity, state, attributes);
}

export async function getLiveAreas(memberId: MemberId): Promise<{ areaId: string; name: string }[]> {
  const store = getHomeAssistantStore();
  if (!(await store.getTokens(memberId))) return [];
  const conn = await getOrCreateConnection(memberId);
  const registry = await getRegistry(memberId, conn);
  return registry.areas.map((area) => ({ areaId: area.area_id, name: area.name }));
}
