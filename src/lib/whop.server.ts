// Whop payments — credentials are configured here in code on purpose (no env vars).

export const WHOP_API_KEY =
  "apik_6NnNpjFMsLXGd_C6609584_C_a75396ced3c88aec110f7e964283d62c258c2241777a6c1e70e5fafad6fddc";
export const WHOP_ACCOUNT_ID = "biz_EWAkxglzBwwDMw";
export const WHOP_API_BASE = "https://api.whop.com/v1";

export async function whopFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${WHOP_API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "content-type": "application/json",
      },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : {};

    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } }).error?.message ??
        `Whop request failed (${response.status})`;
      return { ok: false, message };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Whop request failed" };
  }
}

export type WhopPayment = {
  id: string;
  status: string;
  currency?: string | null;
  amount?: number | null;
  amount_after_fees?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  payment_method_type?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
};

export type WhopPayout = {
  id: string;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  payout_method_id?: string | null;
};

export type WhopPayoutMethod = {
  id: string;
  is_default?: boolean | null;
  type?: string | null;
  status?: string | null;
  last4?: string | null;
  bank_name?: string | null;
};
