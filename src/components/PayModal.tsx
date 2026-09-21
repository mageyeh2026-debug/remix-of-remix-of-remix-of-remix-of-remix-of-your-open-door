import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import {
  checkPesapalSupportPayment,
  checkPesapalPayment,
  FILM_PRICE_UGX,
  FILM_PRICE_USD,
  startPesapalPayment,
  startPesapalSupportPayment,
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

function formatUsd(amount: number) {
  return `USD ${amount.toFixed(2)}`;
}

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
  const isCheckoutOpen = Boolean(frameUrl);
  const amountLabel = isMomo
    ? `UGX ${FILM_PRICE_UGX.toLocaleString()}`
    : `USD ${FILM_PRICE_USD.toFixed(2)}`;

  function cancelPayment() {
    clearPendingMomo();
    setOrderId(null);
    setFrameUrl(null);
    setBusy(false);
    setStatus(null);
    setError("Payment cancelled. Choose a method and try again.");
  }

  // Resume a payment that was started before a refresh and never settled.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFrameUrl(null);
    setStatus(null);
    setBusy(false);

    const pending = loadPendingMomo(slug);
    if (pending) {
      if (pending.method === "mobile_money" || pending.method === "card") setMethod(pending.method);
      if (pending.phone) setPhone(pending.phone);
      startedAt.current = pending.startedAt;
      setOrderId(pending.internalReference);
      if (pending.redirectUrl) setFrameUrl(pending.redirectUrl);
      setBusy(true);
      setStatus(pending.redirectUrl ? "Complete the payment to start watching." : "Checking your last payment…");
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
          ...(isMomo && phone.trim() ? { phone: phone.trim() } : {}),
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
        method,
        phone,
        redirectUrl: result.redirectUrl,
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
      <div className={`pay-modal${isCheckoutOpen ? " pay-modal-checkout" : ""}`}>
        <div className="pay-modal-head">
          <h2>{isCheckoutOpen ? "Complete payment" : `Pay to watch ${title ?? "this movie"}`}</h2>
          <button
            type="button"
            className="pay-close"
            onClick={isCheckoutOpen ? cancelPayment : onBack}
            aria-label={isCheckoutOpen ? "Cancel payment" : "Go back"}
          >
            <X size={20} />
          </button>
        </div>

        {isCheckoutOpen ? (
          <div className="pay-checkout-body">
            <p className={`pay-method-hint${isMomo ? " pay-method-hint-momo" : " pay-method-hint-card"}`}>
              {isMomo ? (
                <>Choose <strong>MTN</strong> or <strong>Airtel</strong> at the top of the payment page, then approve {amountLabel} on your phone.</>
              ) : (
                <>Choose the <strong>Visa / Mastercard</strong> option at the top of the payment page to pay {amountLabel} by card.</>
              )}
            </p>
            <div className="pay-frame pay-frame-standalone">
              <iframe
                src={frameUrl ?? undefined}
                title="Secure payment"
                allow="payment"
                loading="eager"
              />
            </div>
            <div className="pay-checkout-actions">
              <button type="button" className="pay-cancel-button" onClick={cancelPayment}>
                Cancel payment
              </button>
              {status ? <p className="pay-note">{status}</p> : null}
              {error ? <p className="pay-error">{error}</p> : null}
            </div>
          </div>
        ) : (
        <div className="pay-modal-body">
          <div className="pay-methods">
            <p className="pay-label">Payment details</p>
            {METHODS.map((m) => (
              <label key={m.id} className={`pay-method${method === m.id ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="pay-method"
                  checked={method === m.id}
                  onChange={() => {
                    setMethod(m.id);
                    setError(null);
                    setStatus(null);
                  }}
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

            <button
              type="button"
              className="pay-button"
              onClick={() => void pay()}
              disabled={busy || (isMomo && !phone.trim())}
            >
              {busy ? "Opening…" : `Pay ${amountLabel}`}
            </button>

            {status ? <p className="pay-note">{status}</p> : null}
            {error ? <p className="pay-error">{error}</p> : null}
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}

export function SupportPayModal({
  open,
  slug,
  title,
  amountUsd,
  onClose,
}: {
  open: boolean;
  slug: string;
  title: string;
  amountUsd: number;
  onClose: () => void;
}) {
  const startSupportPayment = useServerFn(startPesapalSupportPayment);
  const checkSupportPayment = useServerFn(checkPesapalSupportPayment);

  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const startedAt = useRef(0);

  const guestId = useMemo(() => (typeof window === "undefined" ? "" : getGuestId()), []);
  const guestEmail = useMemo(() => (guestId ? getGuestEmail(guestId) : ""), [guestId]);
  const amountLabel = formatUsd(amountUsd);
  const isCheckoutOpen = Boolean(frameUrl);

  useEffect(() => {
    if (!open) return;
    setFrameUrl(null);
    setOrderId(null);
    setStatus(null);
    setBusy(false);
    setError(null);
    setPaid(false);
  }, [open, slug, amountUsd]);

  useEffect(() => {
    if (!orderId) return;
    let stop = false;

    const tick = async () => {
      if (stop) return;
      try {
        const result = await checkSupportPayment({ data: { orderTrackingId: orderId } });
        if (stop) return;
        if (result.status === "success") {
          stop = true;
          clearInterval(timer);
          setPaid(true);
          setFrameUrl(null);
          setBusy(false);
          setStatus("Thank you. Your support payment was received.");
          return;
        }
        if (result.status === "failed") {
          stop = true;
          clearInterval(timer);
          setFrameUrl(null);
          setOrderId(null);
          setBusy(false);
          setError(result.message || "Payment failed. Please try again.");
          return;
        }
        setStatus(result.message || "Waiting for confirmation");
        if (Date.now() - startedAt.current > 10 * 60 * 1000) {
          stop = true;
          clearInterval(timer);
          setFrameUrl(null);
          setOrderId(null);
          setBusy(false);
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
  }, [orderId]);

  if (!open) return null;

  function cancelSupportPayment() {
    setOrderId(null);
    setFrameUrl(null);
    setBusy(false);
    setStatus(null);
    setError("Payment cancelled. You can try again when ready.");
  }

  async function paySupport() {
    setError(null);
    setBusy(true);
    setStatus("Opening the secure payment page…");
    try {
      const result = await startSupportPayment({
        data: {
          slug,
          title,
          amountUsd: amountUsd === 25 || amountUsd === 50 || amountUsd === 100 ? amountUsd : 25,
          origin: window.location.origin,
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
      setFrameUrl(result.redirectUrl);
      setOrderId(result.orderTrackingId);
      setStatus("Complete the payment below to support this film.");
    } catch {
      setError("Payments are temporarily unavailable.");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="pay-overlay" role="dialog" aria-modal="true" aria-label="Support this film">
      <div className={`pay-modal${isCheckoutOpen ? " pay-modal-checkout" : ""}`}>
        <div className="pay-modal-head">
          <h2>{isCheckoutOpen ? "Complete support payment" : `Support ${title}`}</h2>
          <button
            type="button"
            className="pay-close"
            onClick={isCheckoutOpen ? cancelSupportPayment : onClose}
            aria-label={isCheckoutOpen ? "Cancel payment" : "Close"}
          >
            <X size={20} />
          </button>
        </div>

        {isCheckoutOpen ? (
          <div className="pay-checkout-body">
            <div className="pay-frame pay-frame-standalone">
              <iframe src={frameUrl ?? undefined} title="Secure support payment" allow="payment" loading="eager" />
            </div>
            <div className="pay-checkout-actions">
              <button type="button" className="pay-cancel-button" onClick={cancelSupportPayment}>
                Cancel payment
              </button>
              {status ? <p className="pay-note">{status}</p> : null}
              {error ? <p className="pay-error">{error}</p> : null}
            </div>
          </div>
        ) : (
          <div className="pay-modal-body pay-support-body">
            <div className="pay-methods">
              <p className="pay-label">Support this film</p>
              <div className="support-checkout-copy">
                <strong>{amountLabel}</strong>
                <span>{title}</span>
              </div>
              {paid ? <p className="pay-note">Thank you. Your support payment was received.</p> : null}
            </div>

            <aside className="pay-summary">
              <h3>{title}</h3>
              <p className="pay-summary-sub">Upcoming film support</p>
              <div className="pay-row">
                <span>Support</span>
                <span>{amountLabel}</span>
              </div>
              <div className="pay-total">
                <span>Amount due</span>
                <strong>{amountLabel}</strong>
              </div>
              <button type="button" className="pay-button" onClick={() => void paySupport()} disabled={busy || paid}>
                {paid ? "Payment received" : busy ? "Opening…" : `Pay ${amountLabel}`}
              </button>
              {paid ? (
                <button type="button" className="pay-cancel-button pay-done-button" onClick={onClose}>
                  Done
                </button>
              ) : null}
              {status && !paid ? <p className="pay-note">{status}</p> : null}
              {error ? <p className="pay-error">{error}</p> : null}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
