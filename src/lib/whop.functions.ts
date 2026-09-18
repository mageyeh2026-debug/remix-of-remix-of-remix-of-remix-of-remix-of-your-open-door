import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FILM_PRICE_USD = 5.99;

/** Creates a real Whop checkout session for one film. */
export const createFilmCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        price: z.number().positive().optional(),
        guestId: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { whopFetch, WHOP_ACCOUNT_ID } = await import("./whop.server");

    const result = await whopFetch<{ id: string; plan?: { id?: string } | null; purchase_url?: string }>(
      "/checkout_configurations",
      {
        method: "POST",
        body: {
          account_id: WHOP_ACCOUNT_ID,
          plan: {
            initial_price: data.price ?? FILM_PRICE_USD,
            plan_type: "one_time",
            currency: "usd",
          },
          metadata: {
            slug: data.slug,
            guest_id: data.guestId ?? "guest",
            email: data.email ?? "",
            order_id: `film_${data.slug}_${Date.now()}`,
          },
        },
      },
    );

    if (!result.ok) return { ok: false as const, message: result.message };

    return {
      ok: true as const,
      sessionId: result.data.id,
      planId: result.data.plan?.id ?? null,
      purchaseUrl: result.data.purchase_url ?? null,
    };
  });

/** Confirms the payment with Whop, then issues the rental + playback tickets. */
export const confirmFilmPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        paymentId: z.string().optional(),
        guestId: z.string().min(1).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { whopFetch, WHOP_ACCOUNT_ID } = await import("./whop.server");
    type Payment = import("./whop.server").WhopPayment;
    const done = (status: unknown) => ["succeeded", "completed", "paid"].includes(String(status));

    let paid = false;
    let reference = data.paymentId ?? "";

    if (data.paymentId) {
      const payment = await whopFetch<Payment>(`/payments/${encodeURIComponent(data.paymentId)}`);
      if (payment.ok) paid = done(payment.data.status);
    }

    if (!paid) {
      // Receipt ids from the embed don't always resolve directly — match the
      // most recent succeeded payment for this film / this browser instead.
      const recent = await whopFetch<{ data: Payment[] }>(
        `/payments?account_id=${WHOP_ACCOUNT_ID}&limit=20`,
      );
      if (recent.ok) {
        const cutoff = Date.now() - 1000 * 60 * 60;
        const match = (recent.data.data ?? []).find((p) => {
          const when = Date.parse(String(p.paid_at ?? p.created_at ?? ""));
          const meta = (p.metadata ?? {}) as Record<string, unknown>;
          const slug = String(meta["slug"] ?? "");
          const guest = String(meta["guest_id"] ?? "");
          const sameGuest = !data.guestId || !guest || guest === data.guestId;
          return done(p.status) && slug === data.slug && sameGuest && (!when || when >= cutoff);
        });
        if (match) {
          paid = true;
          reference = String(match.id ?? reference);
        }
      }
    }

    if (!paid) {
      return { ok: false as const, message: "We couldn't confirm the payment yet." };
    }

    const { signPlaybackToken } = await import("./stream-token.server");
    const { signEntitlement } = await import("./entitlement.server");
    const token = await signPlaybackToken({ slug: data.slug, kind: "film" }, 60 * 60 * 4);
    const entitlement = await signEntitlement({
      slug: data.slug,
      guestId: data.guestId ?? "guest",
      provider: "whop",
      ref: reference || "whop",
    });
    return {
      ok: true as const,
      source: { url: `/api/public/stream/${token}`, type: "mp4" as const },
      entitlement,
    };
  });

/** Live Whop money: balance, sales, payouts, transactions and payout methods. */
export const getWhopWallet = createServerFn({ method: "POST" }).handler(async () => {
  const { whopFetch, WHOP_ACCOUNT_ID } = await import("./whop.server");
  type Payment = import("./whop.server").WhopPayment;
  type Payout = import("./whop.server").WhopPayout;
  type PayoutMethod = import("./whop.server").WhopPayoutMethod;

  const [payments, payouts, methods, balances] = await Promise.all([
    whopFetch<{ data: Payment[] }>(`/payments?account_id=${WHOP_ACCOUNT_ID}&limit=50`),
    whopFetch<{ data: Payout[] }>(`/payouts?account_id=${WHOP_ACCOUNT_ID}&limit=50`),
    whopFetch<{ data: PayoutMethod[] }>(`/payout_methods?company_id=${WHOP_ACCOUNT_ID}`),
    whopFetch<{ data: { amount?: number; currency?: string; pending_amount?: number }[] }>(
      `/balances?account_id=${WHOP_ACCOUNT_ID}`,
    ),
  ]);

  const paymentList = payments.ok ? (payments.data.data ?? []) : [];
  const payoutList = payouts.ok ? (payouts.data.data ?? []) : [];

  const succeeded = paymentList.filter((p) =>
    ["succeeded", "completed", "paid"].includes(String(p.status)),
  );
  const sales = succeeded.reduce((sum, p) => sum + Number(p.amount_after_fees ?? p.amount ?? 0), 0);
  const withdrawn = payoutList
    .filter((p) => !["failed", "canceled", "cancelled"].includes(String(p.status)))
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const reported = balances.ok ? (balances.data.data ?? [])[0] : undefined;
  const usdBalance = reported?.amount;

  return {
    currency: "USD",
    balance: Number((usdBalance ?? sales - withdrawn).toFixed(2)),
    balanceSource: usdBalance === undefined ? ("computed" as const) : ("whop" as const),
    sales: Number(sales.toFixed(2)),
    withdrawn: Number(withdrawn.toFixed(2)),
    paymentsCount: succeeded.length,
    payments: paymentList.slice(0, 50),
    payouts: payoutList.slice(0, 50),
    payoutMethods: methods.ok ? (methods.data.data ?? []) : [],
    errors: [payments, payouts, methods].filter((r) => !r.ok).map((r) => (r as { message: string }).message),
  };
});

/** Real Whop payout to the connected payout method. */
export const createWhopPayout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ amount: z.number().positive(), payoutMethodId: z.string().min(1).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { whopFetch, WHOP_ACCOUNT_ID } = await import("./whop.server");
    type PayoutMethod = import("./whop.server").WhopPayoutMethod;

    let methodId = data.payoutMethodId;
    if (!methodId) {
      const methods = await whopFetch<{ data: PayoutMethod[] }>(
        `/payout_methods?company_id=${WHOP_ACCOUNT_ID}`,
      );
      if (!methods.ok) return { ok: false as const, message: methods.message };
      const list = methods.data.data ?? [];
      methodId = (list.find((m) => m.is_default) ?? list[0])?.id;
    }

    if (!methodId) {
      return {
        ok: false as const,
        message:
          "No payout method is set up on Whop yet. Add a bank account or card in your Whop dashboard first.",
      };
    }

    const payout = await whopFetch<{ id: string; status?: string }>("/payouts", {
      method: "POST",
      body: {
        account_id: WHOP_ACCOUNT_ID,
        amount: data.amount,
        currency: "usd",
        payout_method_id: methodId,
      },
    });

    if (!payout.ok) return { ok: false as const, message: payout.message };
    return { ok: true as const, id: payout.data.id, status: payout.data.status ?? "pending" };
  });
