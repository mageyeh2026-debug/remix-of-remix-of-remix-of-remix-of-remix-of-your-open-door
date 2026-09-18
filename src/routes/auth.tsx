import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Mageye Streaming" },
      { name: "description", content: "Sign in to your Mageye account to stream films." },
      { property: "og:title", content: "Sign in | Mageye Streaming" },
      { property: "og:description", content: "Sign in to your Mageye account to stream films." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (signUpError) return setError(signUpError.message);
      if (!data.session) return setMessage("Check your email to confirm your account.");
      navigate({ to: "/films" });
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) return setError(signInError.message);
    navigate({ to: "/films" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return setError("Google sign-in failed. Please try again.");
    if (result.redirected) return;
    navigate({ to: "/films" });
  }

  return (
    <main>
      <SiteHeader />
      <section className="auth-page">
        <div className="auth-card">
          <h1>{mode === "signin" ? "Sign in to Mageye" : "Create your Mageye account"}</h1>
          <p className="auth-sub">Streaming membership · trailers are always free.</p>

          <button type="button" className="auth-google" onClick={google}>
            Continue with Google
          </button>
          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={submit} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </label>
            <button className="pay-button" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {error && <p className="pay-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button
            type="button"
            className="auth-switch"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
