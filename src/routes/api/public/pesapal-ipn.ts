import { createFileRoute } from "@tanstack/react-router";

/**
 * Pesapal settlement notification. Pesapal calls this with the order tracking
 * id; we verify the payment directly against Pesapal (never trusting the
 * request body) and acknowledge it.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  let orderTrackingId = url.searchParams.get("OrderTrackingId") ?? url.searchParams.get("orderTrackingId");
  let merchantReference =
    url.searchParams.get("OrderMerchantReference") ?? url.searchParams.get("merchantReference") ?? "";

  if (!orderTrackingId && request.method === "POST") {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      orderTrackingId = String(body["OrderTrackingId"] ?? body["orderTrackingId"] ?? "") || null;
      merchantReference = String(body["OrderMerchantReference"] ?? merchantReference);
    } catch {
      /* ignore malformed body */
    }
  }

  if (!orderTrackingId) {
    return Response.json({ status: 500, message: "Missing order tracking id" }, { status: 400 });
  }

  const { transactionStatus } = await import("@/lib/pesapal.server");
  const result = await transactionStatus(orderTrackingId, {
    baseUrl:
      (process.env["PESAPAL_ENV"] ?? "live").toLowerCase() === "demo"
        ? "https://cybqa.pesapal.com/pesapalv3"
        : "https://pay.pesapal.com/v3",
    consumerKey: process.env["PESAPAL_CONSUMER_KEY"] ?? "",
    consumerSecret: process.env["PESAPAL_CONSUMER_SECRET"] ?? "",
  });

  return Response.json({
    orderNotificationType: "IPNCHANGE",
    orderTrackingId,
    orderMerchantReference: merchantReference,
    status: result.ok ? 200 : 500,
    paymentStatus: result.ok ? result.data.status : "unknown",
  });
}

export const Route = createFileRoute("/api/public/pesapal-ipn")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
