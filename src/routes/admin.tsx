import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import {
  Clapperboard,
  CreditCard,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Monitor,
  Newspaper,
  Plus,
  RefreshCw,
  Rocket,
  Settings,
  Smartphone,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

import { useServerFn } from "@tanstack/react-start";

import { firebaseAuth, firebaseDb, SITE_PATH } from "@/lib/firebase";
import { createWhopPayout, getWhopWallet } from "@/lib/whop.functions";
import { createMomoWithdrawal, getMomoWallet } from "@/lib/momo.functions";
import { type FilmItem, type SiteContent } from "@/lib/site-content";
import { saveAll, saveSection, useSiteContent } from "@/hooks/useSiteContent";
import { useUploader } from "@/components/UploadProgressOverlay";
import { UPLOAD_BACKEND_STORAGE_KEY } from "@/lib/r2-upload";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin dashboard | Mageye" },
      { name: "description", content: "Manage Mageye films, gallery, news, services, contact and wallet." },
      { property: "og:title", content: "Admin dashboard | Mageye" },
      { property: "og:description", content: "Private management dashboard for the Mageye website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

/* ---------------------------------- login --------------------------------- */

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    } catch (err: any) {
      setError(err?.message?.replace("Firebase: ", "") ?? "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Type your admin email first, then tap “Forgot password”.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim());
      setNotice("Password reset link sent. Check your email inbox (and spam).");
    } catch (err: any) {
      setError(err?.message?.replace("Firebase: ", "") ?? "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <h1>Mageye admin</h1>
        <p>Sign in to manage the website.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="admin-error">{error}</p> : null}
        {notice ? <p className="admin-saved">{notice}</p> : null}
        <button className="admin-btn admin-btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : "Sign in"}
        </button>
        <button type="button" className="admin-link-btn" onClick={forgotPassword} disabled={busy}>
          Forgot password?
        </button>
      </form>
    </div>
  );
}


/* --------------------------------- fields --------------------------------- */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value as any} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
}) {
  const { upload, overlay, busy } = useUploader();
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const [url] = await upload(folder, [file]);
      if (url) onChange(url);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="admin-image-field">
      {overlay}
      <span className="admin-field-label">{label}</span>
      <div className="admin-image-row">
        {value ? <img src={value} alt="" /> : <div className="admin-image-empty">No image</div>}
        <div className="admin-image-controls">
          <input
            className="admin-input"
            placeholder="Image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <label className="admin-btn admin-btn-ghost admin-upload">
            {busy ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/*,.heic,.heif,.hif" hidden onChange={pick} />
          </label>
        </div>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}

function VideoField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
}) {
  const { upload, overlay, busy } = useUploader();
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const [url] = await upload(folder, [file]);
      if (url) onChange(url);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="admin-image-field">
      {overlay}
      <span className="admin-field-label">{label}</span>
      <div className="admin-image-controls">
        <input
          className="admin-input"
          placeholder="Video URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <label className="admin-btn admin-btn-ghost admin-upload">
          {busy ? "Uploading…" : "Upload video"}
          <input type="file" accept="video/*" hidden onChange={pick} />
        </label>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}

function SaveBar({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div className="admin-savebar">
      <button className="admin-btn admin-btn-primary" onClick={onSave} disabled={saving} type="button">
        {saving ? "Saving…" : "Save changes"}
      </button>
      {saved ? <span className="admin-saved">Saved to Firebase</span> : null}
    </div>
  );
}

/* --------------------------------- films ---------------------------------- */

function emptyFilm(upcoming: boolean): FilmItem {
  return {
    slug: `new-${Date.now()}`,
    name: "Untitled",
    year: "",
    runtime: upcoming ? "Coming soon" : "Film",
    genre: "Drama",
    image: "",
    logline: "",
    synopsis: "",
    cast: [],
    ...(upcoming ? { status: "Coming soon" } : { price: 5.99 }),
  };
}

function FilmEditor({
  films,
  onChange,
  upcoming,
}: {
  films: FilmItem[];
  onChange: (films: FilmItem[]) => void;
  upcoming: boolean;
}) {
  const update = (i: number, patch: Partial<FilmItem>) =>
    onChange(films.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <div className="admin-list">
      {films.map((film, i) => (
        <details className="admin-card" key={`${film.slug}-${i}`} open={films.length === 1}>
          <summary>
            {film.image ? <img src={film.image} alt="" /> : <span className="admin-thumb-empty" />}
            <strong>{film.name || "Untitled"}</strong>
            <span className="admin-card-meta">{film.genre}</span>
          </summary>
          <div className="admin-card-body">
            <div className="admin-grid-2">
              <Field label="Title" value={film.name} onChange={(v) => update(i, { name: v })} />
              <Field
                label="Link name (slug)"
                value={film.slug}
                onChange={(v) => update(i, { slug: v.toLowerCase().replace(/\s+/g, "-") })}
              />
              <Field label="Year" value={film.year} onChange={(v) => update(i, { year: v })} />
              <Field label="Genre" value={film.genre} onChange={(v) => update(i, { genre: v })} />
              <Field label="Label" value={film.runtime} onChange={(v) => update(i, { runtime: v })} />
              {upcoming ? (
                <Field label="Status" value={film.status ?? ""} onChange={(v) => update(i, { status: v })} />
              ) : (
                <Field
                  label="Price (USD)"
                  type="number"
                  value={film.price ?? 0}
                  onChange={(v) => update(i, { price: Number(v) || 0 })}
                />
              )}
            </div>
            <ImageField
              label="Poster / cover"
              value={film.image}
              onChange={(v) => update(i, { image: v })}
              folder="films"
            />
            <Field label="Logline" value={film.logline} onChange={(v) => update(i, { logline: v })} />
            <Area label="Synopsis" value={film.synopsis} onChange={(v) => update(i, { synopsis: v })} />
            <Field
              label="Cast (comma separated)"
              value={(film.cast ?? []).join(", ")}
              onChange={(v) => update(i, { cast: v.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
            {!upcoming ? (
              <div className="admin-grid-2">
                <VideoField
                  label="Full film video"
                  value={film.videoUrl ?? ""}
                  onChange={(v) => update(i, { videoUrl: v })}
                  folder="films"
                />
                <VideoField
                  label="Trailer"
                  value={film.trailerUrl ?? ""}
                  onChange={(v) => update(i, { trailerUrl: v })}
                  folder="trailers"
                />
              </div>
            ) : null}
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={() => onChange(films.filter((_, idx) => idx !== i))}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </details>
      ))}
      <button
        type="button"
        className="admin-btn admin-btn-ghost"
        onClick={() => onChange([...films, emptyFilm(upcoming)])}
      >
        <Plus size={15} /> Add {upcoming ? "upcoming project" : "movie"}
      </button>
    </div>
  );
}

/* --------------------------------- wallet --------------------------------- */

type WhopWallet = Awaited<ReturnType<typeof getWhopWallet>>;

function WalletPanel() {
  const loadWallet = useServerFn(getWhopWallet);
  const payout = useServerFn(createWhopPayout);

  const [wallet, setWallet] = useState<WhopWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadWallet();
      setWallet(data);
      if (!methodId) {
        const preferred = data.payoutMethods.find((m) => m.is_default) ?? data.payoutMethods[0];
        if (preferred) setMethodId(preferred.id);
      }
    } catch {
      setError("Could not load Whop wallet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withdraw() {
    const value = Number(amount);
    setMsg(null);
    setError(null);
    if (!value || value <= 0) {
      setError("Enter an amount to withdraw.");
      return;
    }
    if (wallet && value > wallet.balance) {
      setError("That is more than your available balance.");
      return;
    }
    setBusy(true);
    try {
      const result = await payout({
        data: { amount: value, ...(methodId ? { payoutMethodId: methodId } : {}) },
      });
      if (result.ok) {
        setMsg(`Withdrawal sent to Whop (${result.status}).`);
        setAmount("");
        await refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Withdrawal could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const currency = wallet?.currency ?? "USD";

  const transactions = useMemo(() => {
    if (!wallet) return [] as { id: string; date: string; description: string; type: string; status: string; amount: number }[];
    const sales = wallet.payments.map((p) => ({
      id: p.id,
      date: String(p.paid_at ?? p.created_at ?? ""),
      description:
        `Film payment${p.card_brand ? ` · ${p.card_brand} ****${p.card_last4 ?? ""}` : ""}` +
        (p.metadata && p.metadata["slug"] ? ` · ${String(p.metadata["slug"])}` : ""),
      type: "sale",
      status: String(p.status ?? "succeeded"),
      amount: Number(p.amount_after_fees ?? p.amount ?? 0),
    }));
    const outs = wallet.payouts.map((p) => ({
      id: p.id,
      date: String(p.created_at ?? ""),
      description: "Withdrawal to your payout method",
      type: "withdrawal",
      status: String(p.status ?? "pending"),
      amount: -Number(p.amount ?? 0),
    }));
    return [...sales, ...outs].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [wallet]);

  return (
    <div className="admin-section">
      <div className="admin-wallet-cards">
        <div className="admin-wallet-card admin-wallet-main">
          <span>Available balance</span>
          <strong>
            {currency} {(wallet?.balance ?? 0).toFixed(2)}
          </strong>
        </div>
        <div className="admin-wallet-card">
          <span>Total sales</span>
          <strong>
            {currency} {(wallet?.sales ?? 0).toFixed(2)}
          </strong>
        </div>
        <div className="admin-wallet-card">
          <span>Withdrawn</span>
          <strong>
            {currency} {(wallet?.withdrawn ?? 0).toFixed(2)}
          </strong>
        </div>
        <div className="admin-wallet-card">
          <span>Films paid for</span>
          <strong>{wallet?.paymentsCount ?? 0}</strong>
        </div>
      </div>

      <div className="admin-panel-block">
        <h3>Withdraw from Whop</h3>
        <div className="admin-grid-2">
          <Field label="Amount" type="number" value={amount} onChange={setAmount} />
          <label className="admin-field">
            <span>Payout method</span>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              {(wallet?.payoutMethods ?? []).length === 0 ? (
                <option value="">No payout method on Whop yet</option>
              ) : null}
              {(wallet?.payoutMethods ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {[m.bank_name ?? m.type ?? "Payout method", m.last4 ? `****${m.last4}` : null]
                    .filter(Boolean)
                    .join(" ")}
                  {m.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-actions-row">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={withdraw}
            disabled={busy}
          >
            {busy ? "Sending…" : "Withdraw"}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void refresh()}>
            <RefreshCw size={14} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {msg ? <p className="admin-note">{msg}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
        {(wallet?.payoutMethods ?? []).length === 0 ? (
          <p className="admin-note">
            Add a bank account or card on Whop to be able to withdraw. Money from film payments is
            held on Whop until then.
          </p>
        ) : null}
      </div>

      <div className="admin-panel-block">
        <h3>Transactions</h3>
        {loading && !wallet ? (
          <p className="admin-empty">Loading live payments from Whop…</p>
        ) : transactions.length === 0 ? (
          <p className="admin-empty">No payments yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</td>
                  <td>{t.description}</td>
                  <td>{t.type}</td>
                  <td>
                    <span className="admin-pill">{t.status}</span>
                  </td>
                  <td className={t.amount < 0 ? "admin-neg" : "admin-pos"}>
                    {t.amount < 0 ? "-" : "+"}
                    {currency} {Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


/* ---------------------------- mobile money wallet ---------------------------- */

type MomoWallet = Awaited<ReturnType<typeof getMomoWallet>>;

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

function MomoWalletPanel({ paymentBackendUrl }: { paymentBackendUrl: string }) {
  const loadWallet = useServerFn(getMomoWallet);
  const withdrawFn = useServerFn(createMomoWithdrawal);

  const [wallet, setWallet] = useState<MomoWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setWallet(await loadWallet({ data: { baseUrl: paymentBackendUrl } }));
    } catch {
      setError("Could not reach the mobile money service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withdraw() {
    const value = Number(amount);
    setMsg(null);
    setError(null);
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (wallet && value > wallet.balance) {
      setError("Not enough balance in the wallet");
      return;
    }
    setBusy(true);
    try {
      const result = await withdrawFn({ data: { amount: value, phone, baseUrl: paymentBackendUrl } });
      if (result.ok) {
        setMsg(`${result.message} (${ugx(value)} to ${phone}).`);
        setAmount("");
        await refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not reach the payment service");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-section admin-wallet-momo">
      <h3>Mobile Money wallet (MTN / Airtel · UGX)</h3>
      <div className="admin-wallet-cards">
        <div className="admin-wallet-card admin-wallet-main">
          <span>Available balance</span>
          <strong>{ugx(wallet?.balance ?? 0)}</strong>
        </div>
        <div className="admin-wallet-card">
          <span>Total collected</span>
          <strong>{ugx(wallet?.sales ?? 0)}</strong>
        </div>
        <div className="admin-wallet-card">
          <span>Withdrawn</span>
          <strong>{ugx(wallet?.withdrawn ?? 0)}</strong>
        </div>
        <div className="admin-wallet-card">
          <span>Payments received</span>
          <strong>{wallet?.paymentsCount ?? 0}</strong>
        </div>
      </div>

      <div className="admin-panel-block">
        <h3>Withdraw to a phone number</h3>
        <div className="admin-grid-2">
          <Field label="Amount (UGX)" type="number" value={amount} onChange={setAmount} />
          <Field label="MTN or Airtel number" value={phone} onChange={setPhone} />
        </div>
        <div className="admin-actions-row">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => void withdraw()}
            disabled={busy}
          >
            {busy ? "Sending…" : "Withdraw"}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void refresh()}>
            <RefreshCw size={14} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {msg ? <p className="admin-note">{msg}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
        {wallet?.balanceSource === "computed" ? (
          <p className="admin-note">
            Balance shown from successful payments minus payouts while the live balance is
            unavailable.
          </p>
        ) : null}
      </div>

      <div className="admin-panel-block">
        <h3>Mobile Money transactions</h3>
        {loading && !wallet ? (
          <p className="admin-empty">Loading live mobile money transactions…</p>
        ) : (wallet?.transactions ?? []).length === 0 ? (
          <p className="admin-empty">No mobile money payments yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Phone</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(wallet?.transactions ?? []).map((t) => (
                <tr key={t.id}>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                  <td>{t.msisdn ?? "—"}</td>
                  <td>{t.reference}</td>
                  <td>{t.kind}</td>
                  <td>
                    <span className="admin-pill">{t.status}</span>
                  </td>
                  <td className={t.kind === "withdraw" ? "admin-neg" : "admin-pos"}>
                    {t.kind === "withdraw" ? "-" : "+"}
                    {ugx(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- settings -------------------------------- */

function SettingsPanel({
  user,
  integrations,
  onIntegrationsChange,
  onSave,
  saving,
  saved,
}: {
  user: User;
  integrations: SiteContent["integrations"];
  onIntegrationsChange: (value: SiteContent["integrations"]) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function update() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const cred = EmailAuthProvider.credential(user.email ?? "", currentPassword);
      await reauthenticateWithCredential(user, cred);
      if (newEmail && newEmail !== user.email) await updateEmail(user, newEmail);
      if (newPassword) await updatePassword(user, newPassword);
      setMsg("Admin login updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setError(err?.message?.replace("Firebase: ", "") ?? "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-section">
      <div className="admin-panel-block">
        <h3>Payment and upload backends</h3>
        <Field
          label="Mobile Money backend URL"
          value={integrations.paymentBackendUrl}
          onChange={(paymentBackendUrl) => onIntegrationsChange({ ...integrations, paymentBackendUrl })}
        />
        <Field
          label="Upload backend URL"
          value={integrations.uploadBackendUrl}
          onChange={(uploadBackendUrl) => onIntegrationsChange({ ...integrations, uploadBackendUrl })}
        />
        <p className="admin-note">Only secure Railway service addresses are accepted.</p>
        <SaveBar onSave={onSave} saving={saving} saved={saved} />
      </div>
      <div className="admin-panel-block">
        <h3>Change admin login</h3>
        <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} />
        <Field label="New email" value={newEmail} onChange={setNewEmail} />
        <Field label="New password (leave blank to keep)" type="password" value={newPassword} onChange={setNewPassword} />
        {msg ? <p className="admin-saved">{msg}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
        <button type="button" className="admin-btn admin-btn-primary" onClick={update} disabled={busy}>
          {busy ? "Updating…" : "Update login"}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- shell ---------------------------------- */

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "Hero profile", icon: UserRound },
  { id: "movies", label: "Movies", icon: Clapperboard },
  { id: "upcoming", label: "Upcoming", icon: Rocket },
  { id: "services", label: "Services", icon: Wrench },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "media", label: "Media & news", icon: Newspaper },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "wallet", label: "Wallet", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return <div className="admin-loading">Loading…</div>;
  if (!user) return <LoginScreen />;
  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: User }) {
  const { content, loaded, loadError } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<SectionId>("overview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewPath, setPreviewPath] = useState("/");
  const [previewKey, setPreviewKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autosaveReady = useRef(false);

  useEffect(() => {
    if (loaded && !draft) setDraft(content);
  }, [loaded, content, draft]);

  useEffect(() => {
    if (!draft) return;
    window.localStorage.setItem(UPLOAD_BACKEND_STORAGE_KEY, draft.integrations.uploadBackendUrl);
  }, [draft?.integrations.uploadBackendUrl]);

  // Uploads and edits must survive even when the separate save button is
  // missed. Debounce changes so typing does not produce a write per keypress.
  useEffect(() => {
    if (!draft) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    const timer = window.setTimeout(async () => {
      setSaving(true);
      setSaved(false);
      setError(null);
      try {
        await saveAll(draft);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      } catch (err: any) {
        setError(err?.message ?? "Could not save.");
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft]);

  async function persist(next?: SiteContent) {
    const value = next ?? draft;
    if (!value) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const railwayUrl = /^https:\/\/[^/]+\.up\.railway\.app$/i;
      if (!railwayUrl.test(value.integrations.paymentBackendUrl) || !railwayUrl.test(value.integrations.uploadBackendUrl)) {
        throw new Error("Use secure Railway backend URLs ending in .up.railway.app");
      }
      await saveAll(value);
      window.localStorage.setItem(UPLOAD_BACKEND_STORAGE_KEY, value.integrations.uploadBackendUrl);
      setSaved(true);
      setPreviewKey((k) => k + 1);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="admin-loading">
        {loadError ? "Could not load your saved content. Check the connection and refresh." : "Loading saved content…"}
      </div>
    );
  }

  const patch = (p: Partial<SiteContent>) => setDraft({ ...draft, ...p });

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">Mageye admin</div>
        <nav>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`admin-nav-item${section === id ? " active" : ""}`}
              onClick={() => setSection(id)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <span>{user.email}</span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => signOut(firebaseAuth())}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{SECTIONS.find((s) => s.id === section)?.label}</h1>
          {error ? <span className="admin-error">{error}</span> : null}
        </header>

        <div className="admin-content">
          {section === "overview" ? (
            <div className="admin-section">
              <div className="admin-wallet-cards">
                <div className="admin-wallet-card">
                  <span>Movies</span>
                  <strong>{draft.films.length}</strong>
                </div>
                <div className="admin-wallet-card">
                  <span>Upcoming</span>
                  <strong>{draft.upcoming.length}</strong>
                </div>
                <div className="admin-wallet-card">
                  <span>Gallery photos</span>
                  <strong>{draft.gallery.items.length}</strong>
                </div>
                <div className="admin-wallet-card">
                  <span>News items</span>
                  <strong>{draft.media.items.length}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {section === "profile" ? (
            <div className="admin-section">
              <ImageField
                label="Hero photo"
                value={draft.hero.image}
                onChange={(v) => patch({ hero: { ...draft.hero, image: v } })}
                folder="hero"
              />
              <Field
                label="Name / eyebrow"
                value={draft.hero.eyebrow}
                onChange={(v) => patch({ hero: { ...draft.hero, eyebrow: v } })}
              />
              <Area
                label="Headline"
                rows={2}
                value={draft.hero.title}
                onChange={(v) => patch({ hero: { ...draft.hero, title: v } })}
              />
              <Area
                label="Paragraph 1"
                value={draft.hero.intro1}
                onChange={(v) => patch({ hero: { ...draft.hero, intro1: v } })}
              />
              <Area
                label="Paragraph 2"
                value={draft.hero.intro2}
                onChange={(v) => patch({ hero: { ...draft.hero, intro2: v } })}
              />
              <div className="admin-grid-3">
                <Field
                  label="Button 1"
                  value={draft.hero.primaryLabel}
                  onChange={(v) => patch({ hero: { ...draft.hero, primaryLabel: v } })}
                />
                <Field
                  label="Button 2"
                  value={draft.hero.secondaryLabel}
                  onChange={(v) => patch({ hero: { ...draft.hero, secondaryLabel: v } })}
                />
                <Field
                  label="Button 3"
                  value={draft.hero.tertiaryLabel}
                  onChange={(v) => patch({ hero: { ...draft.hero, tertiaryLabel: v } })}
                />
              </div>
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "movies" ? (
            <div className="admin-section">
              <Field
                label="Section heading"
                value={draft.moviesHeading}
                onChange={(v) => patch({ moviesHeading: v })}
              />
              <FilmEditor films={draft.films} upcoming={false} onChange={(films) => patch({ films })} />
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "upcoming" ? (
            <div className="admin-section">
              <div className="admin-grid-2">
                <Field
                  label="Eyebrow"
                  value={draft.upcomingHeading.eyebrow}
                  onChange={(v) => patch({ upcomingHeading: { ...draft.upcomingHeading, eyebrow: v } })}
                />
                <Field
                  label="Heading"
                  value={draft.upcomingHeading.title}
                  onChange={(v) => patch({ upcomingHeading: { ...draft.upcomingHeading, title: v } })}
                />
              </div>
              <FilmEditor films={draft.upcoming} upcoming onChange={(upcoming) => patch({ upcoming })} />
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "services" ? (
            <div className="admin-section">
              <div className="admin-grid-2">
                <Field
                  label="Eyebrow"
                  value={draft.services.eyebrow}
                  onChange={(v) => patch({ services: { ...draft.services, eyebrow: v } })}
                />
                <Field
                  label="Heading"
                  value={draft.services.title}
                  onChange={(v) => patch({ services: { ...draft.services, title: v } })}
                />
              </div>
              <Area
                label="Intro text"
                value={draft.services.lede}
                onChange={(v) => patch({ services: { ...draft.services, lede: v } })}
              />
              <Field
                label="Button label"
                value={draft.services.buttonLabel}
                onChange={(v) => patch({ services: { ...draft.services, buttonLabel: v } })}
              />
              <div className="admin-list">
                {draft.services.items.map((item, i) => (
                  <div className="admin-card admin-card-open" key={item.id}>
                    <div className="admin-card-body">
                      <div className="admin-grid-2">
                        <Field
                          label="Title"
                          value={item.title}
                          onChange={(v) =>
                            patch({
                              services: {
                                ...draft.services,
                                items: draft.services.items.map((s, idx) =>
                                  idx === i ? { ...s, title: v } : s,
                                ),
                              },
                            })
                          }
                        />
                        <label className="admin-field">
                          <span>Icon</span>
                          <select
                            value={item.icon}
                            onChange={(e) =>
                              patch({
                                services: {
                                  ...draft.services,
                                  items: draft.services.items.map((s, idx) =>
                                    idx === i ? { ...s, icon: e.target.value } : s,
                                  ),
                                },
                              })
                            }
                          >
                            {["Building2", "Video", "MonitorPlay", "Play", "Clapperboard", "Wrench"].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <Area
                        label="Description"
                        rows={3}
                        value={item.text}
                        onChange={(v) =>
                          patch({
                            services: {
                              ...draft.services,
                              items: draft.services.items.map((s, idx) => (idx === i ? { ...s, text: v } : s)),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() =>
                          patch({
                            services: {
                              ...draft.services,
                              items: draft.services.items.filter((_, idx) => idx !== i),
                            },
                          })
                        }
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() =>
                    patch({
                      services: {
                        ...draft.services,
                        items: [
                          ...draft.services.items,
                          { id: `s-${Date.now()}`, icon: "Play", title: "New service", text: "" },
                        ],
                      },
                    })
                  }
                >
                  <Plus size={15} /> Add service
                </button>
              </div>
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "gallery" ? (
            <div className="admin-section">
              <div className="admin-grid-2">
                <Field
                  label="Eyebrow"
                  value={draft.gallery.eyebrow}
                  onChange={(v) => patch({ gallery: { ...draft.gallery, eyebrow: v } })}
                />
                <Field
                  label="Heading"
                  value={draft.gallery.title}
                  onChange={(v) => patch({ gallery: { ...draft.gallery, title: v } })}
                />
              </div>
              <Area
                label="Description"
                rows={2}
                value={draft.gallery.description}
                onChange={(v) => patch({ gallery: { ...draft.gallery, description: v } })}
              />
              <MultiUpload
                folder="gallery"
                onUploaded={async (urls) => {
                  const nextGallery = {
                    ...draft.gallery,
                    items: [
                      ...draft.gallery.items,
                      ...urls.map((src, n) => ({
                        id: `g-${Date.now()}-${n}`,
                        src,
                        alt: "Mageye photo",
                        title: "New photo",
                      })),
                    ],
                  };
                  const next = { ...draft, gallery: nextGallery };
                  setDraft(next);
                  await persist(next);
                }}
              />
              <div className="admin-media-grid">
                {draft.gallery.items.map((item, i) => (
                  <div className="admin-media-item" key={item.id}>
                    <img src={item.src} alt={item.alt} />
                    <input
                      className="admin-input"
                      value={item.title}
                      onChange={(e) =>
                        patch({
                          gallery: {
                            ...draft.gallery,
                            items: draft.gallery.items.map((g, idx) =>
                              idx === i ? { ...g, title: e.target.value, alt: e.target.value } : g,
                            ),
                          },
                        })
                      }
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() =>
                        patch({
                          gallery: {
                            ...draft.gallery,
                            items: draft.gallery.items.filter((_, idx) => idx !== i),
                          },
                        })
                      }
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ))}
              </div>
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "media" ? (
            <div className="admin-section">
              <div className="admin-grid-2">
                <Field
                  label="Eyebrow"
                  value={draft.media.eyebrow}
                  onChange={(v) => patch({ media: { ...draft.media, eyebrow: v } })}
                />
                <Field
                  label="Heading"
                  value={draft.media.title}
                  onChange={(v) => patch({ media: { ...draft.media, title: v } })}
                />
              </div>
              <Area
                label="Description"
                rows={2}
                value={draft.media.description}
                onChange={(v) => patch({ media: { ...draft.media, description: v } })}
              />
              <div className="admin-list">
                {draft.media.items.map((item, i) => (
                  <div className="admin-card admin-card-open" key={item.id}>
                    <div className="admin-card-body">
                      <ImageField
                        label="Photo"
                        value={item.src}
                        folder="news"
                        onChange={(v) =>
                          patch({
                            media: {
                              ...draft.media,
                              items: draft.media.items.map((m, idx) => (idx === i ? { ...m, src: v } : m)),
                            },
                          })
                        }
                      />
                      <div className="admin-grid-2">
                        <Field
                          label="Title"
                          value={item.title}
                          onChange={(v) =>
                            patch({
                              media: {
                                ...draft.media,
                                items: draft.media.items.map((m, idx) =>
                                  idx === i ? { ...m, title: v, alt: v } : m,
                                ),
                              },
                            })
                          }
                        />
                        <Field
                          label="Festival / date"
                          value={item.meta}
                          onChange={(v) =>
                            patch({
                              media: {
                                ...draft.media,
                                items: draft.media.items.map((m, idx) => (idx === i ? { ...m, meta: v } : m)),
                              },
                            })
                          }
                        />
                      </div>
                      <Field
                        label="Article link (https://...)"
                        value={item.link ?? ""}
                        onChange={(v) =>
                          patch({
                            media: {
                              ...draft.media,
                              items: draft.media.items.map((m, idx) => (idx === i ? { ...m, link: v } : m)),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() =>
                          patch({
                            media: { ...draft.media, items: draft.media.items.filter((_, idx) => idx !== i) },
                          })
                        }
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() =>
                    patch({
                      media: {
                        ...draft.media,
                        items: [
                          ...draft.media.items,
                          { id: `m-${Date.now()}`, src: "", alt: "", meta: "", title: "New award", link: "" },
                        ],
                      },
                    })
                  }
                >
                  <Plus size={15} /> Add news item
                </button>
              </div>
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "contact" ? (
            <div className="admin-section">
              <div className="admin-grid-2">
                <Field
                  label="Eyebrow"
                  value={draft.contact.eyebrow}
                  onChange={(v) => patch({ contact: { ...draft.contact, eyebrow: v } })}
                />
                <Field
                  label="Button label"
                  value={draft.contact.buttonLabel}
                  onChange={(v) => patch({ contact: { ...draft.contact, buttonLabel: v } })}
                />
              </div>
              <Area
                label="Heading"
                rows={2}
                value={draft.contact.title}
                onChange={(v) => patch({ contact: { ...draft.contact, title: v } })}
              />
              <Area
                label="Intro text"
                rows={2}
                value={draft.contact.lede}
                onChange={(v) => patch({ contact: { ...draft.contact, lede: v } })}
              />
              <div className="admin-grid-3">
                <Field
                  label="Email"
                  value={draft.contact.email}
                  onChange={(v) => patch({ contact: { ...draft.contact, email: v } })}
                />
                <Field
                  label="Phone"
                  value={draft.contact.phone}
                  onChange={(v) => patch({ contact: { ...draft.contact, phone: v } })}
                />
                <Field
                  label="Based in"
                  value={draft.contact.location}
                  onChange={(v) => patch({ contact: { ...draft.contact, location: v } })}
                />
              </div>
              <SaveBar onSave={() => persist()} saving={saving} saved={saved} />
            </div>
          ) : null}

          {section === "wallet" ? (
            <>
              <WalletPanel />
              <MomoWalletPanel paymentBackendUrl={draft.integrations.paymentBackendUrl} />
            </>


          ) : null}

          {section === "settings" ? (
            <SettingsPanel
              user={user}
              integrations={draft.integrations}
              onIntegrationsChange={(integrations) => patch({ integrations })}
              onSave={() => void persist()}
              saving={saving}
              saved={saved}
            />
          ) : null}
        </div>
      </main>

      <aside className="admin-preview">
        <div className="admin-preview-bar">
          <div className="admin-device-toggle">
            <button
              type="button"
              className={device === "desktop" ? "active" : ""}
              onClick={() => setDevice("desktop")}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              type="button"
              className={device === "mobile" ? "active" : ""}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>
          <select value={previewPath} onChange={(e) => setPreviewPath(e.target.value)}>
            <option value="/">Home</option>
            <option value="/films">Movies</option>
            <option value="/gallery">Gallery</option>
            <option value="/about">About</option>
            <option value="/contact">Contact</option>
          </select>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPreviewKey((k) => k + 1)}>
            <RefreshCw size={14} />
          </button>
        </div>
        <div className={`admin-preview-frame ${device}`}>
          <iframe key={`${previewKey}-${previewPath}`} src={previewPath} title="Live preview" />
        </div>
      </aside>
    </div>
  );
}

function MultiUpload({
  folder,
  onUploaded,
}: {
  folder: string;
  onUploaded: (urls: string[]) => void | Promise<void>;
}) {
  const { upload, overlay, busy } = useUploader();
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    try {
      await onUploaded(await upload(folder, files));
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div>
      {overlay}
      <label className="admin-btn admin-btn-primary admin-upload">
        {busy ? "Uploading…" : "Upload photos"}
        <input type="file" accept="image/*,.heic,.heif,.hif" multiple hidden onChange={pick} />
      </label>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}

export { saveSection };
