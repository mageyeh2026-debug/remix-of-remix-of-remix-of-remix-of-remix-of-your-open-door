// Server-only Pesapal API 3.0 client (live + sandbox).
// Keys live in backend secrets and never reach the browser.

export const PESAPAL_LIVE_BASE = "https://pay.pesapal.com/v3";
export const PESAPAL_DEMO_BASE = "https://cybqa.pesapal.com/pesapalv3";

export const FILM_PRICE_UGX = 5000;
export const FILM_PRICE_USD = 5.99;

export type PesapalConfig = { baseUrl: string; consumerKey: string; consumerSecret: string };

type TokenCache = { token: string; expiresAt: number; cacheKey: string };
let tokenCache: TokenCache | null = null;
const ipnCache = new Map<string, string>();

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; message: string };

async function pesapalFetch<T>(
  config: PesapalConfig,
  path: string,
  init?: { method?: string; body?: unknown; token?: string },
): Promise<Ok<T> | Err> {
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      ...(init?.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const text = await res.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { message: text };
    }
    const errorNode = payload["error"];
    const errorMessage =
      errorNode && typeof errorNode === "object"
        ? String(
            (errorNode as Record<string, unknown>)["message"] ??
              (errorNode as Record<string, unknown>)["code"] ??
              "",
          )
        : typeof errorNode === "string"
          ? errorNode
          : "";

    if (!res.ok || errorMessage) {
      return {
        ok: false,
        message:
          errorMessage ||
          String(payload["message"] ?? `Payment service error (${res.status})`),
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, message: "Could not reach the payment service." };
  }
}

async function accessToken(config: PesapalConfig): Promise<Ok<string> | Err> {
  const cacheKey = `${config.baseUrl}:${config.consumerKey}`;
  if (tokenCache && tokenCache.cacheKey === cacheKey && tokenCache.expiresAt > Date.now() + 30_000) {
    return { ok: true, data: tokenCache.token };
  }
  if (!config.consumerKey || !config.consumerSecret) {
    return { ok: false, message: "Payments are not configured yet." };
  }
  const res = await pesapalFetch<{ token?: string; expiryDate?: string }>(config, "/api/Auth/RequestToken", {
    method: "POST",
    body: { consumer_key: config.consumerKey, consumer_secret: config.consumerSecret },
  });
  if (!res.ok) return res;
  const token = res.data.token;
  if (!token) return { ok: false, message: "Payments could not be authorised." };
  const expiresAt = res.data.expiryDate ? Date.parse(res.data.expiryDate) : Date.now() + 4 * 60_000;
  tokenCache = { token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 4 * 60_000, cacheKey };
  return { ok: true, data: token };
}

/** Registers (once per URL) the notification endpoint Pesapal calls on settlement. */
async function notificationId(config: PesapalConfig, token: string, ipnUrl: string): Promise<Ok<string> | Err> {
  const ipnCacheKey = `${config.baseUrl}:${ipnUrl}`;
  const cached = ipnCache.get(ipnCacheKey);
  if (cached) return { ok: true, data: cached };

  const list = await pesapalFetch<Array<{ url?: string; ipn_id?: string }>>(
    config,
    "/api/URLSetup/GetIpnList",
    { token },
  );
  if (list.ok && Array.isArray(list.data)) {
    const match = list.data.find((row) => row.url === ipnUrl && row.ipn_id);
    if (match?.ipn_id) {
      ipnCache.set(ipnCacheKey, match.ipn_id);
      return { ok: true, data: match.ipn_id };
    }
  }

  const registered = await pesapalFetch<{ ipn_id?: string }>(config, "/api/URLSetup/RegisterIPN", {
    method: "POST",
    token,
    body: { url: ipnUrl, ipn_notification_type: "GET" },
  });
  if (!registered.ok) return registered;
  const id = registered.data.ipn_id;
  if (!id) return { ok: false, message: "Payments could not be set up." };
  ipnCache.set(ipnCacheKey, id);
  return { ok: true, data: id };
}

export type SubmitOrderInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  ipnUrl: string;
  phone?: string | undefined;
  email?: string | undefined;
  countryCode?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
};

export async function submitOrder(
  input: SubmitOrderInput,
  config: PesapalConfig,
): Promise<Ok<{ orderTrackingId: string; redirectUrl: string }> | Err> {
  const auth = await accessToken(config);
  if (!auth.ok) return auth;

  const ipn = await notificationId(config, auth.data, input.ipnUrl);
  if (!ipn.ok) return ipn;

  const res = await pesapalFetch<{ order_tracking_id?: string; redirect_url?: string }>(
    config,
    "/api/Transactions/SubmitOrderRequest",
    {
      method: "POST",
      token: auth.data,
      body: {
        id: input.merchantReference,
        currency: input.currency,
        amount: input.amount,
        description: input.description.slice(0, 100),
        callback_url: input.callbackUrl,
        notification_id: ipn.data,
        billing_address: {
          email_address: input.email ?? "",
          phone_number: input.phone ?? "",
          country_code: input.countryCode ?? "UG",
          first_name: input.firstName ?? "Mageye",
          last_name: input.lastName ?? "Viewer",
          line_1: "",
          city: "",
          state: "",
          postal_code: "",
          zip_code: "",
        },
      },
    },
  );
  if (!res.ok) return res;
  const orderTrackingId = res.data.order_tracking_id;
  const redirectUrl = res.data.redirect_url;
  if (!orderTrackingId || !redirectUrl) {
    return { ok: false, message: "The payment page could not be opened." };
  }
  return { ok: true, data: { orderTrackingId, redirectUrl } };
}

export type PesapalStatus = {
  status: "success" | "failed" | "pending";
  message: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  confirmationCode: string;
};

export async function transactionStatus(
  orderTrackingId: string,
  config: PesapalConfig,
): Promise<Ok<PesapalStatus> | Err> {
  const auth = await accessToken(config);
  if (!auth.ok) return auth;

  const res = await pesapalFetch<Record<string, unknown>>(
    config,
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { token: auth.data },
  );
  if (!res.ok) return res;

  const p = res.data;
  const code = Number(p["status_code"] ?? -1);
  const label = String(p["payment_status_description"] ?? "").toLowerCase();
  const status: PesapalStatus["status"] =
    code === 1 || label === "completed"
      ? "success"
      : code === 2 || code === 3 || label === "failed" || label === "reversed" || label === "invalid"
        ? "failed"
        : "pending";

  return {
    ok: true,
    data: {
      status,
      message: String(p["description"] ?? p["message"] ?? "")
        || (status === "success" ? "Payment received" : status === "failed" ? "Payment failed" : "Waiting for confirmation"),
      amount: Number(p["amount"] ?? 0) || 0,
      currency: String(p["currency"] ?? ""),
      method: String(p["payment_method"] ?? ""),
      reference: String(p["merchant_reference"] ?? ""),
      confirmationCode: String(p["confirmation_code"] ?? ""),
    },
  };
}
