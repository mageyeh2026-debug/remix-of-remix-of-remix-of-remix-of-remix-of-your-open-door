import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugInput = (data: unknown) => z.object({ slug: z.string().min(1) }).parse(data);

export const fetchTrailer = createServerFn({ method: "POST" })
  .inputValidator(slugInput)
  .handler(async ({ data }) => {
    const { signPlaybackToken } = await import("./stream-token.server");
    const token = await signPlaybackToken({ slug: data.slug, kind: "trailer" }, 60 * 30);
    return { url: `/api/public/stream/${token}`, type: "mp4" as const };
  });

export const fetchSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("status, plan, current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();

    const active =
      data?.status === "active" &&
      (!data.current_period_end || new Date(data.current_period_end) > new Date());

    return { active: Boolean(active), subscription: data ?? null };
  });

export const fetchFilmStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(slugInput)
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();

    const active =
      sub?.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    if (!active) {
      return { allowed: false as const };
    }

    const { signPlaybackToken } = await import("./stream-token.server");
    const token = await signPlaybackToken(
      { slug: data.slug, kind: "film", uid: context.userId },
      60 * 90,
    );
    return { allowed: true as const, source: { url: `/api/public/stream/${token}`, type: "mp4" as const } };
  });

export const payForFilm = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        method: z.enum(["mobile_money", "card", "paypal", "google_pay"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { signPlaybackToken } = await import("./stream-token.server");
    const token = await signPlaybackToken({ slug: data.slug, kind: "film" }, 60 * 60 * 24);
    return {
      ok: true as const,
      source: { url: `/api/public/stream/${token}`, type: "mp4" as const },
    };
  });

export const startSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ method: z.enum(["mobile_money", "card", "paypal", "google_pay"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: context.userId,
        status: "active",
        plan: "monthly",
        payment_method: data.method,
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, current_period_end: periodEnd.toISOString() };
  });
