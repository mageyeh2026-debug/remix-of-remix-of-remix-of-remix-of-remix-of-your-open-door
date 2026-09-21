import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FILM_PRICE_UGX = 5000;
export const FILM_PRICE_USD = 5.99;

/** Opens a real Pesapal order and returns the secure payment page to embed. */
export const startPesapalPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        method: z.enum(["mobile_money", "card"]),
        origin: z.string().url(),
        title: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { submitOrder, FILM_PRICE_UGX: ugx, FILM_PRICE_USD: usd } = await import("./pesapal.server");

    const isMomo = data.method === "mobile_money";
    const origin = data.origin.replace(/\/+$/, "");
    const reference = `MAGEYE-${data.slug}-${Date.now()}`;

    const result = await submitOrder({
      merchantReference: reference,
      amount: isMomo ? ugx : usd,
      currency: isMomo ? "UGX" : "USD",
      description: data.title ? `Film: ${data.title}` : `Film: ${data.slug}`,
      callbackUrl: `${origin}/watch/${encodeURIComponent(data.slug)}?kind=film`,
      ipnUrl: `${origin}/api/public/pesapal-ipn`,
      phone: data.phone,
      email: data.email,
    });

    if (!result.ok) return { ok: false as const, message: result.message };

    return {
      ok: true as const,
      reference,
      orderTrackingId: result.data.orderTrackingId,
      redirectUrl: result.data.redirectUrl,
      amount: isMomo ? ugx : usd,
      currency: isMomo ? "UGX" : "USD",
    };
  });

/** Checks one Pesapal order; issues the rental + playback tickets once paid. */
export const checkPesapalPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        orderTrackingId: z.string().min(1),
        guestId: z.string().min(1).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { transactionStatus } = await import("./pesapal.server");
    const res = await transactionStatus(data.orderTrackingId);

    if (!res.ok) {
      return { status: "pending" as const, message: "Waiting for confirmation" };
    }
    if (res.data.status !== "success") {
      return { status: res.data.status, message: res.data.message };
    }

    const { signPlaybackToken } = await import("./stream-token.server");
    const { signEntitlement } = await import("./entitlement.server");
    const token = await signPlaybackToken({ slug: data.slug, kind: "film" }, 60 * 60 * 4);
    const entitlement = await signEntitlement({
      slug: data.slug,
      guestId: data.guestId ?? "guest",
      provider: "pesapal",
      ref: res.data.confirmationCode || data.orderTrackingId,
    });

    return {
      status: "success" as const,
      message: res.data.message || "Payment received",
      source: { url: `/api/public/stream/${token}`, type: "mp4" as const },
      entitlement,
    };
  });
