import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { useSiteContent } from "@/hooks/useSiteContent";
import filmsBanner from "@/assets/devils-chest-banner.png";

export const Route = createFileRoute("/films/")({
  head: () => ({
    meta: [
      { title: "Films | Mageye" },
      {
        name: "description",
        content:
          "A collection of films exploring stories, cultural identity and character-driven drama — feature films, documentaries and upcoming projects.",
      },
      { property: "og:title", content: "Films | Mageye" },
      {
        property: "og:description",
        content: "Feature films, documentaries and upcoming projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FilmsPage,
});

function FilmsPage() {
  const { content } = useSiteContent();
  const films = content.films;
  const upcomingFilms = content.upcoming;

  return (
    <main>
      <SiteHeader />

      <section className="films-hero" aria-labelledby="films-title">
        <img
          className="films-hero-image"
          src={filmsBanner}
          alt="Devil's Chest film artwork"
          width={1920}
          height={912}
        />
        <div className="films-hero-copy">
          <h1 id="films-title">Films</h1>
          <p>
            A collection of films exploring human stories, cultural identity and
            character-driven drama.
          </p>
          <span className="films-hero-arrow" aria-hidden="true">↓</span>
        </div>
      </section>

      <section className="films-list" aria-label="All films">
        <div className="films-grid">
          {films.map((film, index) => (
            <article className="film-item" key={film.slug}>
              <Link
                className="film-item-thumb"
                to="/films/$slug"
                params={{ slug: film.slug }}
                aria-label={`${film.name} details`}
              >
                <img
                  src={film.image}
                  alt={`${film.name} film still`}
                  width={900}
                  height={506}
                  loading={index < 4 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index < 4 ? "high" : "low"}
                />
                <span className="film-item-play"><Play size={18} /></span>
              </Link>
              <h2>
                <Link to="/films/$slug" params={{ slug: film.slug }}>{film.name}</Link>
              </h2>
              <p className="film-meta">{film.runtime} · {film.year}</p>
              <p className="film-logline">{film.logline}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="films-list films-list-muted" aria-labelledby="films-upcoming">
        <p className="eyebrow">What’s next</p>
        <h2 id="films-upcoming" className="films-section-title">Upcoming films</h2>
        <div className="films-grid">
          {upcomingFilms.map((film) => (
            <article className="film-item" key={film.slug}>
              <Link
                className="film-item-thumb"
                to="/films/$slug"
                params={{ slug: film.slug }}
                aria-label={`${film.name} details`}
              >
                <img
                  src={film.image}
                  alt={`${film.name} film still`}
                  width={900}
                  height={506}
                  loading="lazy" decoding="async" fetchPriority="low"
                />
                {film.status && <span className="upcoming-status">{film.status}</span>}
              </Link>
              <h3>
                <Link to="/films/$slug" params={{ slug: film.slug }}>{film.name}</Link>
              </h3>
              <p className="film-meta">{film.runtime}</p>
              <p className="film-logline">{film.logline}</p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
