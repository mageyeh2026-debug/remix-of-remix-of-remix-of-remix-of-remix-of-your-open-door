// Server-only signing for rental tickets ("this browser paid for this film
// until <exp>"). Stateless: the ticket itself is the record, so no database is
// needed and the whole flow stays serverless.

const encoder = new TextEncoder();

export type Entitlement = {
  slug: string;
  guestId: string;
  provider: "whop" | "momo" | "pesapal";
  ref: string;
  exp: number;
};

function b64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function key() {
  const secret =
    process.env["ENTITLEMENT_SIGNING_SECRET"] ??
    process.env["STREAM_SIGNING_SECRET"] ??
    "dev-fallback-secret";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`entitlement:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export const RENTAL_MS = 48 * 60 * 60 * 1000;

export async function signEntitlement(
  data: Omit<Entitlement, "exp">,
  ttlMs = RENTAL_MS,
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + ttlMs;
  const body = b64url(encoder.encode(JSON.stringify({ ...data, exp: expiresAt })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)));
  return { token: `${body}.${b64url(sig)}`, expiresAt };
}

export async function verifyEntitlement(token: string): Promise<Entitlement | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  let given: Uint8Array;
  try {
    given = fromB64url(signature);
  } catch {
    return null;
  }

  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)),
  );
  if (given.length !== expected.length) return null;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected[i]! ^ given[i]!;
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Entitlement;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
