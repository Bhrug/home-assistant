export type EntityDomain = "media_player" | "climate" | "light" | "sensor";

export interface HomeEntity {
  entityId: string;
  deviceId: string;
  areaId: string;
  domain: EntityDomain;
  name: string;
  state: string;
  attributes: Record<string, string | number | boolean | string[]>;
  canControl: boolean;
}

export interface HomeAssistantAdapter {
  getEntities(areaId?: string): Promise<HomeEntity[]>;
  setState(entityId: string, state: string, attributes?: HomeEntity["attributes"]): Promise<void>;
  subscribe(listener: (entities: HomeEntity[]) => void): () => void;
}
