import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import type { MemberId } from "@/data/household";

// Placeholder starting PINs. They only apply until a member's PIN has been
// reset once; after that the hashed value in .data/pins.json wins. Because
// this file lives in the repo, treat these as public: have each person reset
// theirs via "Forgot PIN?" on the login screen before relying on them.
const DEFAULT_PINS: Record<MemberId, string> = {
  yuvi: "1111",
  you: "4444",
  lops: "3333",
  anni: "2222",
};

const KEY_LENGTH = 32;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 60 * 1000;

const DATA_DIR = path.join(process.cwd(), ".data");
const PINS_FILE = path.join(DATA_DIR, "pins.json");

function deriveKey(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(pin, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(pin, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function matchesHash(pin: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(pin, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

class PinStore {
  private queue: Promise<unknown> = Promise.resolve();
  private cache: Partial<Record<MemberId, string>> | null = null;
  private attempts = new Map<MemberId, { failures: number; lockedUntil: number }>();

  private async read(): Promise<Partial<Record<MemberId, string>>> {
    if (this.cache) return this.cache;
    try {
      const parsed = JSON.parse(await fs.readFile(PINS_FILE, "utf8")) as { pins?: Partial<Record<MemberId, string>> };
      this.cache = parsed.pins ?? {};
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private write(pins: Partial<Record<MemberId, string>>): Promise<void> {
    const task = this.queue.then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const tmpFile = `${PINS_FILE}.${process.pid}.tmp`;
      await fs.writeFile(tmpFile, JSON.stringify({ pins }, null, 2), "utf8");
      await fs.rename(tmpFile, PINS_FILE);
    });
    this.queue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  lockedForSeconds(memberId: MemberId): number {
    const entry = this.attempts.get(memberId);
    if (!entry || entry.lockedUntil <= Date.now()) return 0;
    return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
  }

  private recordFailure(memberId: MemberId) {
    const entry = this.attempts.get(memberId) ?? { failures: 0, lockedUntil: 0 };
    entry.failures += 1;
    if (entry.failures >= MAX_FAILURES) {
      entry.failures = 0;
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    this.attempts.set(memberId, entry);
  }

  async verify(memberId: MemberId, pin: string): Promise<VerifyResult> {
    const retryAfterSeconds = this.lockedForSeconds(memberId);
    if (retryAfterSeconds > 0) return { ok: false, reason: "locked", retryAfterSeconds };

    const pins = await this.read();
    const stored = pins[memberId];
    const matches = stored
      ? await matchesHash(pin, stored)
      : (() => {
          const expected = Buffer.from(DEFAULT_PINS[memberId]);
          const actual = Buffer.from(pin);
          return expected.length === actual.length && timingSafeEqual(expected, actual);
        })();

    if (!matches) {
      this.recordFailure(memberId);
      const locked = this.lockedForSeconds(memberId);
      return locked > 0 ? { ok: false, reason: "locked", retryAfterSeconds: locked } : { ok: false, reason: "invalid" };
    }

    this.attempts.delete(memberId);
    return { ok: true };
  }

  async set(memberId: MemberId, pin: string): Promise<void> {
    const pins = await this.read();
    pins[memberId] = await hashPin(pin);
    await this.write(pins);
    this.attempts.delete(memberId);
  }
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterSeconds: number };

declare global {
  var __hearthPinStore: PinStore | undefined;
}

function getPinStore(): PinStore {
  if (!globalThis.__hearthPinStore) {
    globalThis.__hearthPinStore = new PinStore();
  }
  return globalThis.__hearthPinStore;
}

export function verifyMemberPin(memberId: MemberId, pin: string): Promise<VerifyResult> {
  return getPinStore().verify(memberId, pin);
}

export function setMemberPin(memberId: MemberId, pin: string): Promise<void> {
  return getPinStore().set(memberId, pin);
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}
