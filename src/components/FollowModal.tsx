import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { push, ref, serverTimestamp } from "firebase/database";

import { firebaseDb } from "@/lib/firebase";

/**
 * "Follow for free" — a small floating form that collects an email address and
 * stores it under `followers` in the database so the team can send updates.
 */
export function FollowModal({
  open,
  slug,
  title,
  onClose,
  onSubscribed,
}: {
  open: boolean;
  slug: string;
  title?: string | undefined;
  onClose: () => void;
  onSubscribed: (slug: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDone(false);
    setBusy(false);
  }, [open, slug]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await push(ref(firebaseDb(), "followers"), {
        email: value,
        name: name.trim() || null,
        film: title ?? slug,
        slug,
        createdAt: serverTimestamp(),
      });
      setDone(true);
      onSubscribed(slug);
    } catch {
      setError("We could not save your email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pay-overlay" role="dialog" aria-modal="true" aria-label="Follow this film">
      <div className="pay-modal follow-modal">
        <button type="button" className="pay-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h3 className="pay-title">Follow for free</h3>
        <p className="pay-sub">
          {done
            ? "You are on the list. We will email you every update."
            : `Get updates on ${title ?? "this film"} — production news, trailers and release dates.`}
        </p>

        {done ? (
          <button type="button" className="pay-button" onClick={onClose}>
            Done
          </button>
        ) : (
          <form className="follow-form" onSubmit={submit}>
            <label className="follow-field">
              <span>Name (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            <label className="follow-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            {error ? <p className="pay-error">{error}</p> : null}
            <button type="submit" className="pay-button" disabled={busy}>
              {busy ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
