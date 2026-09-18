import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import logoAsset from "@/assets/sanyuka-logo.png.asset.json";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Mageye home">
      <img src={logoAsset.url} alt="Mageye logo" className="brand-logo" />
      <span>Mageye</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link to="/" onClick={onNavigate}>Home</Link>
      <Link to="/films" onClick={onNavigate}>Movies</Link>
      <Link to="/gallery" onClick={onNavigate}>Gallery</Link>
      <Link to="/about" onClick={onNavigate}>About</Link>
      <Link to="/contact" onClick={onNavigate}>Contact</Link>
    </>
  );
}

export function SiteHeader() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="site-header">
      <Brand />
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLinks />
      </nav>
      {session ? (
        <button type="button" className="button button-dark header-cta" onClick={signOut}>
          Sign out
        </button>
      ) : null}
      <button
        type="button"
        className={`nav-toggle${menuOpen ? " open" : ""}`}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div className={`mobile-menu${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <nav aria-label="Mobile navigation">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <Brand />
      <p>California, USA · Available worldwide</p>
      <p>© 2026 Mageye</p>
    </footer>
  );
}
