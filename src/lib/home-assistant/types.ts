// Real Home Assistant instances expose many more domains than the mock
// data ever needed (person, sun, zone, automation, ...), so this stays a
// plain string rather than a closed union. src/components/home-dashboard.tsx
// only renders cards for a known controllable subset.
export type EntityDomain = string;

export interface HomeEntity {
  entityId: string;
  deviceId: string;
  areaId: string;
  domain: EntityDomain;
  name: string;
  state: string;
  attributes: Record<string, unknown>;
  canControl: boolean;
}

export interface HomeAssistantAdapter {
  getEntities(areaId?: string): Promise<HomeEntity[]>;
  setState(entityId: string, state: string, attributes?: HomeEntity["attributes"]): Promise<void>;
  subscribe(listener: (entities: HomeEntity[]) => void): () => void;
}
