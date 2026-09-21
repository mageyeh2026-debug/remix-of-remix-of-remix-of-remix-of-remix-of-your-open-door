import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { useSiteContent } from "@/hooks/useSiteContent";
import { hideBrokenImage } from "@/lib/utils";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery | Mageye" },
      {
        name: "description",
        content: "Photos, film stills, posters, production moments and upcoming-project images from Mageye.",
      },
      { property: "og:title", content: "Gallery | Mageye" },
      {
        property: "og:description",
        content: "Browse Mageye film stills, posters and production photography.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { content } = useSiteContent();
  const gallery = content.gallery;
  const items = gallery.items;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [lightboxLoaded, setLightboxLoaded] = useState(false);

  const close = useCallback(() => setOpenIndex(null), []);
  const markLoaded = useCallback((key: string) => {
    setLoadedImages((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);
  const step = useCallback(
    (direction: -1 | 1) =>
      setOpenIndex((current) =>
        current === null || !items.length ? current : (current + direction + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, step]);

  const active = openIndex === null ? null : items[openIndex];

  useEffect(() => {
    setLightboxLoaded(false);
  }, [active?.src]);

  return (
    <main>
      <SiteHeader />

      <section className="gallery-page-hero" aria-labelledby="gallery-page-title">
        <p className="eyebrow">{gallery.eyebrow}</p>
        <h1 id="gallery-page-title">{gallery.title}</h1>
        <p>{gallery.description}</p>
      </section>

      <section className="gallery-page-grid" aria-label="All gallery pictures">
        {items.map((item, index) => {
          const imageKey = item.id ?? `${item.src}-${index}`;
          const loaded = Boolean(loadedImages[imageKey]);
          return (
          <figure className={`gallery-page-item${loaded ? "" : " is-loading"}`} key={imageKey}>
            {!loaded ? <span className="gallery-loading-overlay" aria-hidden="true"><span /></span> : null}
            <img
              src={item.src}
              alt={item.alt}
              loading="eager"
              decoding="async"
              fetchPriority={index < 6 ? "high" : "auto"}
              width={1200}
              height={800}
              onLoad={() => markLoaded(imageKey)}
              onError={(event) => {
                markLoaded(imageKey);
                hideBrokenImage(event);
              }}
              onClick={() => setOpenIndex(index)}
              style={{ cursor: "zoom-in" }}
            />
            <figcaption>{item.title}</figcaption>
          </figure>
        );})}
      </section>

      {active ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={active.title ?? "Picture"} onClick={close}>
          <button className="lightbox-close" type="button" aria-label="Close" onClick={close}>
            <X size={22} />
          </button>
          <button
            className="lightbox-nav lightbox-prev"
            type="button"
            aria-label="Previous picture"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            <ChevronLeft size={28} />
          </button>
          <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <div className={`lightbox-image-wrap${lightboxLoaded ? "" : " is-loading"}`}>
              {!lightboxLoaded ? <span className="gallery-loading-overlay lightbox-loading" aria-hidden="true"><span /></span> : null}
              <img
                src={active.src}
                alt={active.alt}
                decoding="async"
                onLoad={() => setLightboxLoaded(true)}
                onError={(event) => {
                  setLightboxLoaded(true);
                  hideBrokenImage(event);
                }}
              />
            </div>
            <figcaption>
              {active.title}
              <span className="lightbox-count">
                {(openIndex ?? 0) + 1} / {items.length}
              </span>
            </figcaption>
          </figure>
          <button
            className="lightbox-nav lightbox-next"
            type="button"
            aria-label="Next picture"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            <ChevronRight size={28} />
          </button>
        </div>
      ) : null}

      <SiteFooter />
    </main>
  );
}
