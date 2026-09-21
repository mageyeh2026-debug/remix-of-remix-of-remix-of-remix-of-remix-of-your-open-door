import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FILM_PRICE_UGX = 5000;
export const FILM_PRICE_USD = 5.99;
export const SUPPORT_PRICE_USD = [25, 50, 100] as const;

function normalizeCountryCode(value?: string | null) {
  const country = value?.trim().toUpperCase();
  if (!country || country === "XX" || country === "T1") return null;
  return /^[A-Z]{2}$/.test(country) ? country : null;
}

async function pesapalConfig() {
  const { resolvePesapalConfig } = await import("./pesapal.server");
  return resolvePesapalConfig();
}

async function requestCountryCode() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest() as Request & { cf?: { country?: string } };
  return (
    normalizeCountryCode(request.cf?.country) ??
    normalizeCountryCode(request.headers.get("cf-ipcountry")) ??
    normalizeCountryCode(request.headers.get("x-vercel-ip-country")) ??
    normalizeCountryCode(request.headers.get("cloudfront-viewer-country")) ??
    normalizeCountryCode(request.headers.get("x-country-code")) ??
    "UG"
  );
}

function safeReferencePart(value: string, fallback: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || fallback;
}

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
    const safeSlug = safeReferencePart(data.slug, "film");
    const reference = `MAGEYE-${safeSlug || "film"}-${Date.now()}`;
    const countryCode = await requestCountryCode();

    const result = await submitOrder({
      merchantReference: reference,
      amount: isMomo ? ugx : usd,
      currency: isMomo ? "UGX" : "USD",
      description: data.title ? `Film: ${data.title}` : `Film: ${data.slug}`,
      callbackUrl: `${origin}/watch/${encodeURIComponent(data.slug)}?kind=film`,
      cancellationUrl: `${origin}/watch/${encodeURIComponent(data.slug)}?kind=film&payment=cancelled`,
      ipnUrl: `${origin}/api/public/pesapal-ipn`,
      phone: data.phone,
      email: data.email,
      countryCode,
    }, await pesapalConfig());

    if (!result.ok) return { ok: false as const, message: result.message };

    return {
      ok: true as const,
      reference,
      orderTrackingId: result.data.orderTrackingId,
      redirectUrl: result.data.redirectUrl,
      amount: isMomo ? ugx : usd,
      currency: isMomo ? "UGX" : "USD",
      countryCode,
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
    const res = await transactionStatus(data.orderTrackingId, await pesapalConfig());

    if (!res.ok) {
      return { status: "pending" as const, message: "Waiting for confirmation" };
    }
    if (res.data.status !== "success") {
      return { status: res.data.status, message: res.data.message };
    }

    const expectedReferencePart = safeReferencePart(data.slug, "film");
    const belongsToFilm = res.data.reference.startsWith(`MAGEYE-${expectedReferencePart}-`);
    const validAmount =
      (res.data.currency === "UGX" && res.data.amount === FILM_PRICE_UGX) ||
      (res.data.currency === "USD" && res.data.amount === FILM_PRICE_USD);
    if (!belongsToFilm || !validAmount) {
      return { status: "failed" as const, message: "This payment does not match this film." };
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

/** Opens a real Pesapal order for upcoming-film support tiers. */
export const startPesapalSupportPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        title: z.string().min(1),
        amountUsd: z.union([z.literal(25), z.literal(50), z.literal(100)]),
        origin: z.string().url(),
        email: z.string().email().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { submitOrder } = await import("./pesapal.server");
    const origin = data.origin.replace(/\/+$/, "");
    const safeSlug = safeReferencePart(data.slug, "support");
    const reference = `MAGEYE-SUPPORT-${safeSlug}-${data.amountUsd}-${Date.now()}`;
    const countryCode = await requestCountryCode();

    const result = await submitOrder({
      merchantReference: reference,
      amount: data.amountUsd,
      currency: "USD",
      description: `Support: ${data.title} - $${data.amountUsd}`,
      callbackUrl: `${origin}/?support=${encodeURIComponent(data.slug)}`,
      cancellationUrl: `${origin}/?support=${encodeURIComponent(data.slug)}&payment=cancelled`,
      ipnUrl: `${origin}/api/public/pesapal-ipn`,
      email: data.email,
      countryCode,
    }, await pesapalConfig());

    if (!result.ok) return { ok: false as const, message: result.message };

    return {
      ok: true as const,
      reference,
      orderTrackingId: result.data.orderTrackingId,
      redirectUrl: result.data.redirectUrl,
      amount: data.amountUsd,
      currency: "USD",
      countryCode,
    };
  });

/** Checks a support order without granting film playback access. */
export const checkPesapalSupportPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ orderTrackingId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { transactionStatus } = await import("./pesapal.server");
    const res = await transactionStatus(data.orderTrackingId, await pesapalConfig());

    if (!res.ok) return { status: "pending" as const, message: "Waiting for confirmation" };
    if (res.data.status !== "success") return { status: res.data.status, message: res.data.message };

    const expectedReferencePart = safeReferencePart(data.orderTrackingId, "");
    if (!res.data.reference.startsWith("MAGEYE-SUPPORT-") || !res.data.confirmationCode) {
      return { status: "failed" as const, message: "This support payment could not be verified." };
    }

    return {
      status: "success" as const,
      message: res.data.message || "Support payment received",
      confirmationCode: res.data.confirmationCode,
      amount: res.data.amount,
      currency: res.data.currency,
      method: res.data.method,
    };
  });
