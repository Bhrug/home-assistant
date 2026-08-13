import type { MemberId } from "@/data/household";

const STATE_TTL_MS = 10 * 60 * 1000;

interface PendingAuth {
  memberId: MemberId;
  expiresAt: number;
}

class PendingAuthStore {
  private pending = new Map<string, PendingAuth>();

  create(memberId: MemberId): string {
    this.sweep();
    const state = crypto.randomUUID();
    this.pending.set(state, { memberId, expiresAt: Date.now() + STATE_TTL_MS });
    return state;
  }

  consume(state: string): MemberId | null {
    const entry = this.pending.get(state);
    this.pending.delete(state);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.memberId;
  }

  private sweep() {
    const now = Date.now();
    for (const [state, entry] of this.pending) {
      if (entry.expiresAt < now) this.pending.delete(state);
    }
  }
}

declare global {
  var __hearthPendingAuthStore: PendingAuthStore | undefined;
}

export function getPendingAuthStore(): PendingAuthStore {
  if (!globalThis.__hearthPendingAuthStore) {
    globalThis.__hearthPendingAuthStore = new PendingAuthStore();
  }
  return globalThis.__hearthPendingAuthStore;
}
