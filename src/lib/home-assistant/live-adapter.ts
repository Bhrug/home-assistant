"use client";

import type { MemberId } from "@/data/household";
import type { HomeAssistantAdapter, HomeEntity } from "./types";

export class LiveHomeAssistantAdapter implements HomeAssistantAdapter {
  constructor(private readonly memberId: MemberId) {}

  async getEntities(areaId?: string): Promise<HomeEntity[]> {
    const response = await fetch(`/api/home-assistant/entities?memberId=${encodeURIComponent(this.memberId)}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { entities?: HomeEntity[] };
    const entities = data.entities ?? [];
    return areaId ? entities.filter((entity) => entity.areaId === areaId) : entities;
  }

  async setState(entityId: string, state: string, attributes: HomeEntity["attributes"] = {}): Promise<void> {
    await fetch("/api/home-assistant/service-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: this.memberId, entityId, state, attributes }),
    });
  }

  subscribe(listener: (entities: HomeEntity[]) => void): () => void {
    const source = new EventSource(`/api/home-assistant/stream?memberId=${encodeURIComponent(this.memberId)}`);
    source.addEventListener("entities", (event) => {
      try {
        const entities = JSON.parse((event as MessageEvent<string>).data) as HomeEntity[];
        listener(entities);
      } catch (error) {
        console.error("Failed to parse Home Assistant stream payload", error);
      }
    });
    return () => source.close();
  }
}
