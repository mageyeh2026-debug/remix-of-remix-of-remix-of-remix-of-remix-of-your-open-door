import { createFileRoute } from "@tanstack/react-router";

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

  return (
    <main>
      <SiteHeader />

      <section className="gallery-page-hero" aria-labelledby="gallery-page-title">
        <p className="eyebrow">{gallery.eyebrow}</p>
        <h1 id="gallery-page-title">{gallery.title}</h1>
        <p>{gallery.description}</p>
      </section>

      <section className="gallery-page-grid" aria-label="All gallery pictures">
        {gallery.items.map((item, index) => (
          <figure className="gallery-page-item" key={item.id ?? `${item.src}-${index}`}>
            <img
              src={item.src}
              alt={item.alt}
              loading={index < 8 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index < 4 ? "high" : "low"}
              width={1200}
              height={800}
              onError={hideBrokenImage}
            />
            <figcaption>{item.title}</figcaption>
          </figure>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
