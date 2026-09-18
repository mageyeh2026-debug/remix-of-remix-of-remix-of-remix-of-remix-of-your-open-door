/** Relworx mobile money backend (MTN / Airtel Uganda). Key lives in the backend. */
export const MOMO_BASE = "https://function-bun-production-e268.up.railway.app";

export const FILM_PRICE_UGX = 5000;

export function normalizeMsisdn(input: string): string {
  const d = (input ?? "").replace(/[^0-9]/g, "");
  if (d.startsWith("256")) return `+${d}`;
  if (d.startsWith("0")) return `+256${d.slice(1)}`;
  if (d.length === 9) return `+256${d}`;
  return `+${d}`;
}

export function isValidMsisdn(value: string): boolean {
  return /^\+256[37]\d{8}$/.test(normalizeMsisdn(value));
}

export async function momoCall<T = Record<string, unknown>>(
  path: string,
  init?: { method?: string; body?: unknown; baseUrl?: string },
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const baseUrl =
      init?.baseUrl && /^https:\/\/[^/]+\.up\.railway\.app$/i.test(init.baseUrl)
        ? init.baseUrl.replace(/\/+$/, "")
        : MOMO_BASE;
    const res = await fetch(`${baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const text = await res.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { message: text };
    }
    if (!res.ok) {
      if (/LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED/i.test(JSON.stringify(payload))) {
        return {
          ok: false,
          message: "You have insufficient balance on your Mobile Money account. Deposit money on your Mobile Money account and try again.",
        };
      }
      const message =
        (payload["message"] as string) ??
        (payload["error"] as string) ??
        `Payment service error (${res.status})`;
      return { ok: false, message: String(message) };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, message: "Could not reach the payment service." };
  }
}

const SUCCESS = /^(success|successful|completed|complete|paid)$/i;
const FAILED = /^(failed|failure|cancelled|canceled|declined|error|rejected|expired)$/i;

export function readStatus(payload: Record<string, unknown>): {
  status: "success" | "failed" | "pending";
  message: string;
} {
  const pick = (obj: unknown, key: string) =>
    obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined;
  const raw =
    payload["status"] ??
    pick(payload["data"], "status") ??
    pick(payload["request"], "status") ??
    pick(payload["transaction"], "status") ??
    payload["request_status"];
  const providerMessage = String(
    payload["message"] ?? pick(payload["data"], "message") ?? pick(payload["request"], "message") ?? "",
  );
  const serialized = JSON.stringify(payload);
  const lowBalance = /LOW_BALANCE_OR_PAYEE_LIMIT_REACHED_OR_NOT_ALLOWED/i.test(serialized);
  const message = lowBalance
    ? "You have insufficient balance on your Mobile Money account. Deposit money on your Mobile Money account and try again."
    : providerMessage;
  if (lowBalance) return { status: "failed", message };
  if (typeof raw === "string") {
    if (SUCCESS.test(raw)) return { status: "success", message: message || "Payment received" };
    if (FAILED.test(raw)) return { status: "failed", message: message || "Payment failed" };
  }
  if (raw == null && payload["success"] === false) {
    return { status: "failed", message: message || "Payment failed" };
  }
  return { status: "pending", message: message || "Waiting for confirmation" };
}

export type MomoTransaction = {
  id: string;
  reference: string;
  internal_reference: string | null;
  msisdn: string | null;
  amount: number;
  currency: string;
  status: string;
  kind: string;
  created_at: string;
};

export function normalizeTransactions(payload: unknown): MomoTransaction[] {
  const p = (payload ?? {}) as Record<string, unknown>;
  let rows: unknown[] = [];
  for (const candidate of [p["transactions"], (p["data"] as Record<string, unknown>)?.["transactions"], p["data"], p["results"], p]) {
    if (Array.isArray(candidate)) {
      rows = candidate;
      break;
    }
  }
  return rows.map((row, i) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const raw = String(r["status"] ?? r["request_status"] ?? "pending");
    const rawType = String(r["transaction_type"] ?? r["type"] ?? r["kind"] ?? "").toLowerCase();
    const amount = Number(r["amount"] ?? r["value"] ?? 0) || 0;
    const kind: MomoTransaction["kind"] =
      rawType.includes("withdraw") || rawType.includes("payout")
        ? "withdraw"
        : rawType.includes("collection") || rawType.includes("payment")
          ? "payment"
          : amount < 0
            ? "withdraw"
            : "payment";
    return {
      id: String(r["id"] ?? r["internal_reference"] ?? r["reference"] ?? `rw-${i}`),
      reference: String(r["reference"] ?? r["customer_reference"] ?? "—"),
      internal_reference: r["internal_reference"] ? String(r["internal_reference"]) : null,
      msisdn: r["msisdn"] ? String(r["msisdn"]) : r["phone"] ? String(r["phone"]) : null,
      amount,
      currency: String(r["currency"] ?? "UGX"),
      status: SUCCESS.test(raw) ? "success" : FAILED.test(raw) ? "failed" : raw.toLowerCase(),
      kind,
      created_at: String(r["created_at"] ?? r["date"] ?? r["updated_at"] ?? new Date().toISOString()),
    };
  });
}
