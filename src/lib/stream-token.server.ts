// Server-only signing helpers for short-lived playback tickets.
// The real media URL is never sent to the browser; the browser only ever
// receives an opaque, expiring ticket that our own proxy route resolves.

type Payload = {
  slug: string;
  kind: "film" | "trailer";
  uid?: string;
  exp: number;
};

const encoder = new TextEncoder();

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

async function hmacKey() {
  const secret = process.env["STREAM_SIGNING_SECRET"] ?? "dev-fallback-secret";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function signPlaybackToken(
  data: Omit<Payload, "exp">,
  ttlSeconds = 60 * 90,
): Promise<string> {
  const payload: Payload = { ...data, exp: Date.now() + ttlSeconds * 1000 };
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body)));
  return `${body}.${b64url(signature)}`;
}

export async function verifyPlaybackToken(token: string): Promise<Payload | null> {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body)),
  );
  const given = fromB64url(signature);
  if (given.length !== expected.length) return null;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected[i]! ^ given[i]!;
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
