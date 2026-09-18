import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { WhopExpressCheckoutButton } from "@whop/checkout/react";

import { confirmFilmPayment, createFilmCheckout, FILM_PRICE_USD } from "@/lib/whop.functions";
import { checkMomoPayment, FILM_PRICE_UGX, startMomoPayment } from "@/lib/momo.functions";
import {
  clearPendingMomo,
  getGuestEmail,
  getGuestId,
  loadPendingMomo,
  savePendingMomo,
  type StoredAccess,
} from "@/lib/access";
import visaLogo from "@/assets/payment-logos/visa.svg";
import mastercardLogo from "@/assets/payment-logos/mastercard.svg";
import paypalLogo from "@/assets/payment-logos/paypal.svg";
import airtelLogo from "@/assets/payment-logos/airtel.svg";
import mtnLogo from "@/assets/payment-logos/mtn.svg";

type Method = "mobile_money" | "card" | "paypal";

const BrandLogo = ({ src, label }: { src: string; label: string }) => <img src={src} className="pay-logo-svg" alt={label} />;

const METHODS: { id: Method; name: string; sub?: string; currency: string; logos: React.ReactNode }[] = [
  { id: "mobile_money", name: "Mobile Money", sub: "(MTN / Airtel)", currency: "UGX", logos: (<><BrandLogo src={mtnLogo} label="MTN MoMo" /><BrandLogo src={airtelLogo} label="Airtel Money" /></>) },
  { id: "card", name: "Card", currency: "USD", logos: (<><BrandLogo src={visaLogo} label="Visa" /><BrandLogo src={mastercardLogo} label="Mastercard" /></>) },
  { id: "paypal", name: "PayPal", currency: "USD", logos: <BrandLogo src={paypalLogo} label="PayPal" /> },
];

type ExpressMethod = "whop-pay";

const EXPRESS_METHODS: Record<Method, ExpressMethod[]> = {
  mobile_money: ["whop-pay"],
  card: ["whop-pay"],
  paypal: ["whop-pay"],
};

export function PayModal({
  open,
  slug,
  title,
  onBack,
  onPaid,
  paymentBackendUrl,
}: {
  open: boolean;
  slug: string;
  title?: string | undefined;
  onBack: () => void;
  onPaid: (url: string, entitlement: StoredAccess) => void;
  paymentBackendUrl?: string | undefined;
}) {
  const startCheckout = useServerFn(createFilmCheckout);
  const confirm = useServerFn(confirmFilmPayment);
  const startMomo = useServerFn(startMomoPayment);
  const checkMomo = useServerFn(checkMomoPayment);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [whopReady, setWhopReady] = useState(false);
  const [method, setMethod] = useState<Method>("mobile_money");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // mobile money state
  const [phone, setPhone] = useState("");
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoStatus, setMomoStatus] = useState<string | null>(null);
  const [momoBusy, setMomoBusy] = useState(false);
  const startedAt = useRef<number>(0);

  const guestId = useMemo(() => (typeof window === "undefined" ? "" : getGuestId()), []);
  const guestEmail = useMemo(() => (guestId ? getGuestEmail(guestId) : ""), [guestId]);

  useEffect(() => {
    let cancelled = false;
    setSessionId(null);
    setWhopReady(false);
    setError(null);

    if (open) {
      setMomoRef(null);
      setMomoStatus(null);
      setMomoBusy(false);

      // A payment that was started before a refresh and never settled resumes here.
      const pending = loadPendingMomo(slug);
      if (pending) {
        setMethod("mobile_money");
        if (pending.phone) setPhone(pending.phone);
        startedAt.current = pending.startedAt;
        setMomoBusy(true);
        setMomoRef(pending.internalReference);
        setMomoStatus("Checking your last Mobile Money payment…");
      } else {
        setMethod("mobile_money");
      }
    }

    startCheckout({
      data: {
        slug,
        price: FILM_PRICE_USD,
        ...(guestId ? { guestId } : {}),
        ...(guestEmail ? { email: guestEmail } : {}),
      },
    })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setSessionId(result.sessionId);
        else setError(result.message);
      })
      .catch(() => !cancelled && setError("Checkout could not be opened. Please try again."));

    return () => {
      cancelled = true;
    };
  }, [open, slug, guestId, guestEmail]);

  // poll the mobile money request until it succeeds, fails or times out
  useEffect(() => {
    if (!momoRef) return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        const result = await checkMomo({
          data: {
            slug,
            internalReference: momoRef,
            ...(guestId ? { guestId } : {}),
            ...(paymentBackendUrl ? { baseUrl: paymentBackendUrl } : {}),
          },
        });
        if (stop) return;
        if (result.status === "success" && "source" in result && result.source) {
          stop = true;
          clearInterval(timer);
          clearPendingMomo();
          onPaid(result.source.url, result.entitlement);
          return;
        }
        if (result.status === "failed") {
          stop = true;
          clearInterval(timer);
          clearPendingMomo();
          setMomoRef(null);
          setMomoBusy(false);
          setMomoStatus(null);
          setError(result.message || "Payment failed. Please try again.");
          return;
        }
        setMomoStatus(result.message || "Waiting for confirmation");
        if (Date.now() - startedAt.current > 5 * 60 * 1000) {
          stop = true;
          clearInterval(timer);
          clearPendingMomo();
          setMomoRef(null);
          setMomoBusy(false);
          setMomoStatus(null);
          setError("The request timed out. Please try again.");
        }
      } catch {
        setMomoStatus("Waiting for confirmation");
      }
    };

    const timer = setInterval(() => void tick(), 1500);
    void tick();
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [momoRef, slug, guestId]);

  if (!open) return null;

  async function complete(paymentId?: string) {
    setConfirming(true);
    setError(null);
    try {
      const result = await confirm({
        data: { slug, ...(paymentId ? { paymentId } : {}), ...(guestId ? { guestId } : {}) },
      });
      if (result.ok) onPaid(result.source.url, result.entitlement);
      else setError(result.message);
    } catch {
      setError("We couldn't confirm the payment. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function payWithMomo() {
    setError(null);
    setMomoBusy(true);
    setMomoStatus("Sending the prompt to your phone…");
    try {
      const result = await startMomo({
        data: { slug, phone, amount: FILM_PRICE_UGX, ...(title ? { title } : {}), ...(paymentBackendUrl ? { baseUrl: paymentBackendUrl } : {}) },
      });
      if (!result.ok) {
        setError(result.message);
        setMomoBusy(false);
        setMomoStatus(null);
        return;
      }
      startedAt.current = Date.now();
      savePendingMomo({
        slug,
        internalReference: result.internalReference,
        startedAt: startedAt.current,
        phone,
      });
      setMomoRef(result.internalReference);
      setMomoStatus("Approve the prompt on your phone to finish.");
    } catch {
      setError("Payments are temporarily unavailable.");
      setMomoBusy(false);
      setMomoStatus(null);
    }
  }

  const returnUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/watch/${encodeURIComponent(slug)}?kind=film`;

  const isMomo = method === "mobile_money";

  return (
    <div className="pay-overlay" role="dialog" aria-modal="true" aria-label="Pay to watch">
      <div className="pay-modal">
        <div className="pay-modal-head">
          <h2>Pay to watch {title ?? "this movie"}</h2>
          <button type="button" className="pay-close" onClick={onBack} aria-label="Go back">
            <X size={20} />
          </button>
        </div>

        <div className="pay-modal-body">
          <div className="pay-methods">
            <p className="pay-label">Payment details</p>
            {METHODS.map((m) => (
              <label key={m.id} className={`pay-method${method === m.id ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="pay-method"
                  checked={method === m.id}
                  disabled={Boolean(momoRef)}
                  onChange={() => setMethod(m.id)}
                />
                <span className="pay-logos">{m.logos}</span>
                <span className="pay-method-name">
                  {m.name}
                  {m.sub ? <span className="pay-method-sub"> {m.sub}</span> : null}
                </span>
                <span className="pay-currency">{m.currency}</span>
              </label>
            ))}

            <p className="pay-note">
              Billing region: <strong>International</strong> · Mobile Money is charged in
              shillings, all other methods in US dollars.
            </p>
          </div>

          <aside className="pay-summary">
            {isMomo ? (
              <div className="pay-momo">
                <label className="pay-field">
                  <span>MTN or Airtel number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0770 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={Boolean(momoRef)}
                  />
                </label>
                <p className="pay-note">
                  You'll get a prompt on your phone to approve UGX {FILM_PRICE_UGX.toLocaleString()}.
                </p>
              </div>
            ) : null}
            <h3>{title ?? "Mageye film"}</h3>
            <p className="pay-summary-sub">One film · watch now</p>
            <div className="pay-row">
              <span>1 film</span>
              <span>
                {isMomo ? `UGX ${FILM_PRICE_UGX.toLocaleString()}` : `USD ${FILM_PRICE_USD.toFixed(2)}`}
              </span>
            </div>
            <div className="pay-row">
              <span>Total</span>
              <span>
                {isMomo ? `UGX ${FILM_PRICE_UGX.toLocaleString()}` : `USD ${FILM_PRICE_USD.toFixed(2)}`}
              </span>
            </div>
            <div className="pay-total">
              <span>Amount due</span>
              <strong>
                {isMomo ? `UGX ${FILM_PRICE_UGX.toLocaleString()}` : `USD ${FILM_PRICE_USD.toFixed(2)}`}
              </strong>
            </div>

            {isMomo ? (
              <button
                type="button"
                className="pay-button"
                onClick={() => void payWithMomo()}
                disabled={momoBusy || !phone.trim()}
              >
                {momoRef ? "Waiting for approval…" : momoBusy ? "Sending…" : "Pay"}
              </button>
            ) : null}

            <div className={`pay-express${isMomo ? " pay-express-preload" : ""}`}>
              {sessionId ? (
                <div className={whopReady && !isMomo ? "pay-express-ready" : "pay-express-hidden"}>
                  <WhopExpressCheckoutButton
                    checkoutConfigurationId={sessionId}
                    returnUrl={returnUrl}
                    {...(guestEmail ? { prefill: { email: guestEmail } } : {})}
                    methods={EXPRESS_METHODS[method]}
                    theme="light"
                    themeOptions={{ accentColor: "violet", highContrast: true }}
                    onExpressMethodResolved={({ rendered }) => setWhopReady(rendered !== "none")}
                    onComplete={(_planId, receiptId) => {
                      void complete(receiptId ?? undefined);
                    }}
                    onPaymentError={(err) =>
                      setError(err?.message ?? "Payment failed. Please try another method.")
                    }
                  />
                </div>
              ) : null}
            </div>

            {momoStatus ? <p className="pay-note">{momoStatus}</p> : null}
            {confirming ? <p className="pay-note">Unlocking your film…</p> : null}
            {error ? <p className="pay-error">{error}</p> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
