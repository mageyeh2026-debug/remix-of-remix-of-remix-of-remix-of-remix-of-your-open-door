import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FILM_PRICE_UGX = 5000;

/** Pushes the MTN / Airtel prompt to the buyer's phone. */
export const startMomoPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        phone: z.string().min(6),
        amount: z.number().positive().optional(),
        title: z.string().optional(),
        baseUrl: z.string().url().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { momoCall, normalizeMsisdn, isValidMsisdn, readStatus, FILM_PRICE_UGX: price } =
      await import("./momo.server");

    const msisdn = normalizeMsisdn(data.phone);
    if (!isValidMsisdn(msisdn)) {
      return { ok: false as const, message: "Enter a valid MTN or Airtel number, e.g. 0770 123 456" };
    }

    const reference = `MAGEYE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await momoCall<Record<string, unknown>>("/api/deposit", {
      method: "POST",
      body: {
        msisdn,
        amount: Math.round(data.amount ?? price),
        currency: "UGX",
        reference,
        description: data.title ? `Film: ${data.title}` : `Film: ${data.slug}`,
      },
      ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
    });

    if (!result.ok) return { ok: false as const, message: result.message };

    const payload = result.data;
    const internal =
      payload["internal_reference"] ??
      (payload["data"] as Record<string, unknown> | undefined)?.["internal_reference"];

    if (!internal) {
      const first = readStatus(payload);
      return {
        ok: false as const,
        message: first.message || "The payment service did not start the request.",
      };
    }

    return {
      ok: true as const,
      reference,
      internalReference: String(internal),
      msisdn,
    };
  });

/** Polls one mobile money request; issues the playback ticket once paid. */
export const checkMomoPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        internalReference: z.string().min(1),
        guestId: z.string().min(1).optional(),
        baseUrl: z.string().url().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { momoCall, readStatus } = await import("./momo.server");

    const res = await momoCall<Record<string, unknown>>(
      `/api/request-status?internal_reference=${encodeURIComponent(data.internalReference)}`,
      data.baseUrl ? { baseUrl: data.baseUrl } : undefined,
    );
    if (!res.ok) {
      const insufficientBalance = /insufficient balance/i.test(res.message);
      return {
        status: insufficientBalance ? ("failed" as const) : ("pending" as const),
        message: insufficientBalance ? res.message : "Waiting for confirmation",
      };
    }

    const state = readStatus(res.data);
    if (state.status !== "success") {
      return { status: state.status, message: state.message };
    }

    const { signPlaybackToken } = await import("./stream-token.server");
    const { signEntitlement } = await import("./entitlement.server");
    const token = await signPlaybackToken({ slug: data.slug, kind: "film" }, 60 * 60 * 4);
    const entitlement = await signEntitlement({
      slug: data.slug,
      guestId: data.guestId ?? "guest",
      provider: "momo",
      ref: data.internalReference,
    });
    return {
      status: "success" as const,
      message: state.message || "Payment received",
      source: { url: `/api/public/stream/${token}`, type: "mp4" as const },
      entitlement,
    };
  });

/** Live mobile money wallet: balance and real transactions. */
export const getMomoWallet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ baseUrl: z.string().url().optional() }).parse(data ?? {}))
  .handler(async ({ data }) => {
  const { momoCall, normalizeTransactions } = await import("./momo.server");

  const [balanceRes, txRes] = await Promise.all([
    momoCall<Record<string, unknown>>("/api/wallet/balance?currency=UGX", data.baseUrl ? { baseUrl: data.baseUrl } : undefined),
    momoCall<Record<string, unknown>>("/api/transactions", data.baseUrl ? { baseUrl: data.baseUrl } : undefined),
  ]);

  const transactions = txRes.ok
    ? normalizeTransactions(txRes.data).filter((transaction) => transaction.reference.startsWith("MAGEYE-"))
    : [];
  const paid = transactions.filter((t) => t.status === "success" && t.kind !== "withdraw");
  const out = transactions.filter((t) => t.status === "success" && t.kind === "withdraw");
  const sales = paid.reduce((s, t) => s + Math.abs(t.amount), 0);
  const withdrawn = out.reduce((s, t) => s + Math.abs(t.amount), 0);

  let live: number | null = null;
  if (balanceRes.ok) {
    const b = balanceRes.data;
    const raw =
      b["balance"] ??
      (b["data"] as Record<string, unknown> | undefined)?.["balance"] ??
      (b["wallet"] as Record<string, unknown> | undefined)?.["balance"] ??
      b["available_balance"];
    const value = Number(raw);
    live = Number.isFinite(value) ? value : null;
  }

  return {
    currency: "UGX",
    balance: live ?? sales - withdrawn,
    balanceSource: live === null ? ("computed" as const) : ("live" as const),
    sales,
    withdrawn,
    paymentsCount: paid.length,
    transactions,
    error: !balanceRes.ok && !txRes.ok ? "Payments are temporarily unavailable." : null,
  };
  });

/** Real mobile money payout — money actually leaves the wallet. */
export const createMomoWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ phone: z.string().min(6), amount: z.number().positive(), note: z.string().optional(), baseUrl: z.string().url().optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { momoCall, normalizeMsisdn, isValidMsisdn, readStatus } = await import("./momo.server");

    const msisdn = normalizeMsisdn(data.phone);
    if (!isValidMsisdn(msisdn)) {
      return { ok: false as const, message: "Enter a valid Ugandan MTN or Airtel number" };
    }
    const value = Math.round(data.amount);
    if (!value || value <= 0) return { ok: false as const, message: "Enter a valid amount" };

    const reference = `MAGEYE-WD-${Date.now()}`;
    const res = await momoCall<Record<string, unknown>>("/api/withdraw", {
      method: "POST",
      body: {
        msisdn,
        amount: value,
        currency: "UGX",
        reference,
        description: data.note || "Payout",
      },
      ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
    });
    if (!res.ok) return { ok: false as const, message: res.message };

    const internal =
      res.data["internal_reference"] ??
      (res.data["data"] as Record<string, unknown> | undefined)?.["internal_reference"] ??
      null;

    let last = readStatus(res.data);
    if (!internal) {
      if (last.status === "failed") return { ok: false as const, message: last.message || "Payout rejected" };
      return { ok: true as const, reference, status: last.status, message: last.message };
    }

    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await momoCall<Record<string, unknown>>(
        `/api/request-status?internal_reference=${encodeURIComponent(String(internal))}`,
        data.baseUrl ? { baseUrl: data.baseUrl } : undefined,
      );
      if (!poll.ok) continue;
      last = readStatus(poll.data);
      if (last.status !== "pending") break;
    }

    if (last.status === "failed") {
      return { ok: false as const, message: last.message || "Payout rejected" };
    }
    return {
      ok: true as const,
      reference,
      status: last.status,
      message: last.status === "success" ? "Payout sent" : "Still processing",
    };
  });
