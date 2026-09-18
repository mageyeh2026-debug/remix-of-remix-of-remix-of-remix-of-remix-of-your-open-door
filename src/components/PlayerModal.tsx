import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { fetchTrailer } from "@/lib/streaming.functions";

const ShakaPlayer = lazy(() => import("@/components/ShakaPlayer"));

type Props = {
  slug: string | null;
  title?: string | undefined;
  poster?: string | undefined;
  onClose: () => void;
};

/** Floating trailer player — no page change, plays over the current screen. */
export function PlayerModal({ slug, title, poster, onClose }: Props) {
  const trailer = useServerFn(fetchTrailer);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    if (!slug) return;

    trailer({ data: { slug } })
      .then((source) => {
        if (!cancelled) setSrc(source.url);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [slug, onClose]);

  if (!slug) return null;

  return (
    <div className="player-overlay" role="dialog" aria-modal="true" aria-label={`${title ?? "Film"} trailer`}>
      <div className="player-backdrop" onClick={onClose} />
      <div className="player-shell">
        <button type="button" className="player-close" onClick={onClose} aria-label="Close player">
          <X size={18} />
        </button>
        {src ? (
          <Suspense fallback={<div className="player-loading">Loading player…</div>}>
            <ShakaPlayer src={src} poster={poster} title={title ? `${title} — Trailer` : "Trailer"} />
          </Suspense>
        ) : (
          <div className="player-loading">
            {failed ? "This trailer could not be loaded." : "Preparing secure playback…"}
          </div>
        )}
      </div>
    </div>
  );
}
