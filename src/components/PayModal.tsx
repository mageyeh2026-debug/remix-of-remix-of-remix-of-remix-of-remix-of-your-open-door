import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import {
  checkPesapalPayment,
  FILM_PRICE_UGX,
  FILM_PRICE_USD,
  startPesapalPayment,
} from "@/lib/pesapal.functions";
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
import airtelLogo from "@/assets/payment-logos/airtel.svg";
import mtnLogo from "@/assets/payment-logos/mtn.svg";

type Method = "mobile_money" | "card";

const BrandLogo = ({ src, label }: { src: string; label: string }) => (
  <img src={src} className="pay-logo-svg" alt={label} />
);

const METHODS: { id: Method; name: string; sub?: string; currency: string; logos: React.ReactNode }[] = [
  {
    id: "mobile_money",
    name: "Mobile Money",
    sub: "(MTN / Airtel)",
    currency: "UGX",
    logos: (
      <>
        <BrandLogo src={mtnLogo} label="MTN MoMo" />
        <BrandLogo src={airtelLogo} label="Airtel Money" />
      </>
    ),
  },
  {
    id: "card",
    name: "Card",
    currency: "USD",
    logos: (
      <>
        <BrandLogo src={visaLogo} label="Visa" />
        <BrandLogo src={mastercardLogo} label="Mastercard" />
      </>
    ),
  },
];

export function PayModal({
  open,
  slug,
  title,
  onBack,
  onPaid,
}: {
  open: boolean;
  slug: string;
  title?: string | undefined;
  onBack: () => void;
  onPaid: (url: string, entitlement: StoredAccess) => void;
  paymentBackendUrl?: string | undefined;
}) {
  const startPayment = useServerFn(startPesapalPayment);
  const checkPayment = useServerFn(checkPesapalPayment);

  const [method, setMethod] = useState<Method>("mobile_money");
  const [phone, setPhone] = useState("");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(0);

  const guestId = useMemo(() => (typeof window === "undefined" ? "" : getGuestId()), []);
  const guestEmail = useMemo(() => (guestId ? getGuestEmail(guestId) : ""), [guestId]);

  const isMomo = method === "mobile_money";
  const amountLabel = isMomo
    ? `UGX ${FILM_PRICE_UGX.toLocaleString()}`
    : `USD ${FILM_PRICE_USD.toFixed(2)}`;

  // Resume a payment that was started before a refresh and never settled.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFrameUrl(null);
    setStatus(null);
    setBusy(false);

    const pending = loadPendingMomo(slug);
    if (pending) {
      if (pending.phone) setPhone(pending.phone);
      startedAt.current = pending.startedAt;
      setOrderId(pending.internalReference);
      setBusy(true);
      setStatus("Checking your last payment…");
    } else {
      setOrderId(null);
    }
  }, [open, slug]);

  // Poll Pesapal until the order succeeds, fails or times out.
  useEffect(() => {
    if (!orderId) return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        const result = await checkPayment({
          data: { slug, orderTrackingId: orderId, ...(guestId ? { guestId } : {}) },
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
          setOrderId(null);
          setFrameUrl(null);
          setBusy(false);
          setStatus(null);
          setError(result.message || "Payment failed. Please try again.");
          return;
        }
        setStatus(result.message || "Waiting for confirmation");
        if (Date.now() - startedAt.current > 10 * 60 * 1000) {
          stop = true;
          clearInterval(timer);
          clearPendingMomo();
          setOrderId(null);
          setFrameUrl(null);
          setBusy(false);
          setStatus(null);
          setError("The payment timed out. Please try again.");
        }
      } catch {
        setStatus("Waiting for confirmation");
      }
    };

    const timer = setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [orderId, slug, guestId]);

  if (!open) return null;

  async function pay() {
    setError(null);
    setBusy(true);
    setStatus("Opening the secure payment page…");
    try {
      const result = await startPayment({
        data: {
          slug,
          method,
          origin: window.location.origin,
          ...(title ? { title } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(guestEmail ? { email: guestEmail } : {}),
        },
      });
      if (!result.ok) {
        setError(result.message);
        setBusy(false);
        setStatus(null);
        return;
      }
      startedAt.current = Date.now();
      savePendingMomo({
        slug,
        internalReference: result.orderTrackingId,
        startedAt: startedAt.current,
        phone,
      });
      setFrameUrl(result.redirectUrl);
      setOrderId(result.orderTrackingId);
      setStatus("Complete the payment below to start watching.");
    } catch {
      setError("Payments are temporarily unavailable.");
      setBusy(false);
      setStatus(null);
    }
  }

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
                  disabled={Boolean(frameUrl)}
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
              Payments are processed securely by Pesapal. Mobile Money is charged in shillings,
              cards in US dollars.
            </p>

            {frameUrl ? (
              <div className="pay-frame">
                <iframe
                  src={frameUrl}
                  title="Secure payment"
                  allow="payment"
                  loading="eager"
                />
              </div>
            ) : null}
          </div>

          <aside className="pay-summary">
            {isMomo && !frameUrl ? (
              <div className="pay-momo">
                <label className="pay-field">
                  <span>MTN or Airtel number</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0770 123 456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <p className="pay-note">
                  You'll approve {amountLabel} on your phone to start watching.
                </p>
              </div>
            ) : null}
            <h3>{title ?? "Mageye film"}</h3>
            <p className="pay-summary-sub">One film · watch now</p>
            <div className="pay-row">
              <span>1 film</span>
              <span>{amountLabel}</span>
            </div>
            <div className="pay-row">
              <span>Total</span>
              <span>{amountLabel}</span>
            </div>
            <div className="pay-total">
              <span>Amount due</span>
              <strong>{amountLabel}</strong>
            </div>

            {!frameUrl ? (
              <button
                type="button"
                className="pay-button"
                onClick={() => void pay()}
                disabled={busy || (isMomo && !phone.trim())}
              >
                {busy ? "Opening…" : `Pay ${amountLabel}`}
              </button>
            ) : null}

            {status ? <p className="pay-note">{status}</p> : null}
            {error ? <p className="pay-error">{error}</p> : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
