import { promises as fs } from "fs";
import path from "path";
import type { MemberId } from "@/data/household";

export interface HomeAssistantTokens {
  hassUrl: string;
  clientId: string;
  access_token: string;
  refresh_token: string;
  expires: number;
  expires_in: number;
}

interface HomeAssistantState {
  tokens: Partial<Record<MemberId, HomeAssistantTokens>>;
  roomMapping: Partial<Record<MemberId, string>>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "home-assistant-state.json");

class HomeAssistantStateStore {
  private queue: Promise<unknown> = Promise.resolve();
  private cache: HomeAssistantState | null = null;

  private async read(): Promise<HomeAssistantState> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(STATE_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<HomeAssistantState>;
      this.cache = { tokens: parsed.tokens ?? {}, roomMapping: parsed.roomMapping ?? {} };
    } catch {
      this.cache = { tokens: {}, roomMapping: {} };
    }
    return this.cache;
  }

  private async write(state: HomeAssistantState) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmpFile = `${STATE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(state, null, 2), "utf8");
    await fs.rename(tmpFile, STATE_FILE);
    this.cache = state;
  }

  // Serializes read-modify-write cycles so concurrent callers within this
  // single Node process can't race each other's writes.
  private mutate<T>(fn: (state: HomeAssistantState) => T): Promise<T> {
    const task = this.queue.then(async () => {
      const state = await this.read();
      const result = fn(state);
      await this.write(state);
      return result;
    });
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  async getTokens(memberId: MemberId): Promise<HomeAssistantTokens | null> {
    const state = await this.read();
    return state.tokens[memberId] ?? null;
  }

  saveTokens(memberId: MemberId, tokens: HomeAssistantTokens): Promise<void> {
    return this.mutate((state) => {
      state.tokens[memberId] = tokens;
    });
  }

  clearTokens(memberId: MemberId): Promise<void> {
    return this.mutate((state) => {
      delete state.tokens[memberId];
    });
  }

  async getRoomMapping(memberId: MemberId): Promise<string | null> {
    const state = await this.read();
    return state.roomMapping[memberId] ?? null;
  }

  async getAllRoomMappings(): Promise<Partial<Record<MemberId, string>>> {
    const state = await this.read();
    return { ...state.roomMapping };
  }

  setRoomMapping(memberId: MemberId, areaId: string): Promise<void> {
    return this.mutate((state) => {
      state.roomMapping[memberId] = areaId;
    });
  }
}

declare global {
  var __hearthHomeAssistantStore: HomeAssistantStateStore | undefined;
}

export function getHomeAssistantStore(): HomeAssistantStateStore {
  if (!globalThis.__hearthHomeAssistantStore) {
    globalThis.__hearthHomeAssistantStore = new HomeAssistantStateStore();
  }
  return globalThis.__hearthHomeAssistantStore;
}
