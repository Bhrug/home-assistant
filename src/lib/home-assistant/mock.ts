import type { HomeAssistantAdapter, HomeEntity } from "./types";

export const initialEntities: HomeEntity[] = [
  { entityId: "media_player.yuvis_echo", deviceId: "device-yuvi-echo", areaId: "yuvi-bedroom", domain: "media_player", name: "Alexa", state: "idle", attributes: { source: "Amazon Echo", volume: 35, muted: false }, canControl: true },
  { entityId: "media_player.yuvis_sonos", deviceId: "device-yuvi-sonos", areaId: "yuvi-bedroom", domain: "media_player", name: "Sonos", state: "playing", attributes: { title: "Daylight", artist: "David Kushner", volume: 42, muted: false }, canControl: true },
  { entityId: "climate.yuvis_thermostat", deviceId: "device-yuvi-thermostat", areaId: "yuvi-bedroom", domain: "climate", name: "Heating", state: "heat", attributes: { current_temperature: 20.5, temperature: 21, min: 16, max: 24 }, canControl: true },
  { entityId: "light.living_room_lamps", deviceId: "device-living-lamps", areaId: "living-room", domain: "light", name: "Living room lights", state: "on", attributes: { brightness: 65 }, canControl: true },
  { entityId: "media_player.living_room_sonos", deviceId: "device-living-sonos", areaId: "living-room", domain: "media_player", name: "Living room Sonos", state: "idle", attributes: { volume: 30, muted: false }, canControl: true },
  { entityId: "climate.downstairs", deviceId: "device-downstairs-climate", areaId: "living-room", domain: "climate", name: "Downstairs heating", state: "heat", attributes: { current_temperature: 21, temperature: 21, min: 16, max: 24 }, canControl: true },
  { entityId: "sensor.home_alarm", deviceId: "device-alarm", areaId: "hallway", domain: "sensor", name: "Home alarm", state: "armed_home", attributes: {}, canControl: false },
];

export class MockHomeAssistantAdapter implements HomeAssistantAdapter {
  private entities = initialEntities.map((entity) => ({ ...entity, attributes: { ...entity.attributes } }));
  private listeners = new Set<(entities: HomeEntity[]) => void>();

  async getEntities(areaId?: string) {
    return this.entities.filter((entity) => !areaId || entity.areaId === areaId);
  }

  async setState(entityId: string, state: string, attributes: HomeEntity["attributes"] = {}) {
    this.entities = this.entities.map((entity) => entity.entityId === entityId ? { ...entity, state, attributes: { ...entity.attributes, ...attributes } } : entity);
    this.listeners.forEach((listener) => listener(this.entities));
  }

  subscribe(listener: (entities: HomeEntity[]) => void) {
    this.listeners.add(listener);
    listener(this.entities);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
