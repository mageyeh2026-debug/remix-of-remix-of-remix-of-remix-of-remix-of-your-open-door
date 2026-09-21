// Client-safe helpers for the "no account" paid-access model.
//
// Nobody signs in. Instead every browser gets an anonymous guest id, and a paid
// film is remembered as a short-lived, server-signed access ticket in
// localStorage. On every visit the ticket is exchanged (server side) for a fresh
// playback link, so a refresh never loses access and the film is never
// permanently owned.

export const RENTAL_HOURS = 48;

const GUEST_KEY = "mageye-guest-v1";
const ACCESS_KEY = "mageye-access-v1";
const PENDING_KEY = "mageye-momo-pending-v1";

export type StoredAccess = { token: string; expiresAt: number };
export type PendingMomo = {
  slug: string;
  internalReference: string;
  startedAt: number;
  method?: "mobile_money" | "card";
  phone?: string;
  redirectUrl?: string;
};

const hasWindow = () => typeof window !== "undefined";

function read<T>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — access simply won't persist */
  }
}

function randomId() {
  if (hasWindow() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable anonymous id for this browser. */
export function getGuestId(): string {
  if (!hasWindow()) return "";
  let id = window.localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = randomId();
    try {
      window.localStorage.setItem(GUEST_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

/** Whop requires an email — we mint a stable one per browser. */
export function getGuestEmail(id = getGuestId()): string {
  return `viewer.${id || "guest"}@guest.mageyefilms.com`;
}

/* ---------------------------------- access --------------------------------- */

type AccessMap = Record<string, StoredAccess>;

export function loadAccess(slug: string): StoredAccess | null {
  const map = read<AccessMap>(ACCESS_KEY) ?? {};
  const entry = map[slug];
  if (!entry?.token || !entry.expiresAt) return null;
  if (entry.expiresAt <= Date.now()) {
    clearAccess(slug);
    return null;
  }
  return entry;
}

export function saveAccess(slug: string, entry: StoredAccess) {
  const map = read<AccessMap>(ACCESS_KEY) ?? {};
  map[slug] = entry;
  write(ACCESS_KEY, map);
}

export function clearAccess(slug: string) {
  const map = read<AccessMap>(ACCESS_KEY) ?? {};
  if (slug in map) {
    delete map[slug];
    write(ACCESS_KEY, map);
  }
}

/* ----------------------------- pending momo ------------------------------- */

/** Only a still-unfinished mobile money request is kept, so a refresh resumes
 *  polling exactly once and never for an already-settled payment. */
export function loadPendingMomo(slug: string): PendingMomo | null {
  const entry = read<PendingMomo>(PENDING_KEY);
  if (!entry?.internalReference || entry.slug !== slug) return null;
  // give up on anything older than 20 minutes
  if (Date.now() - entry.startedAt > 20 * 60 * 1000) {
    clearPendingMomo();
    return null;
  }
  return entry;
}

export function savePendingMomo(entry: PendingMomo) {
  write(PENDING_KEY, entry);
}

export function clearPendingMomo() {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function formatRemaining(expiresAt: number): string {
  const ms = Math.max(0, expiresAt - Date.now());
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
