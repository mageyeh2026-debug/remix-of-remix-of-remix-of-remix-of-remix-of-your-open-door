import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PlayerModal, prefetchTrailer } from "@/components/PlayerModal";
import { allFilms, getFilm } from "@/lib/films";
import { useSiteContent } from "@/hooks/useSiteContent";
import type { FilmItem } from "@/lib/site-content";

export const Route = createFileRoute("/films/$slug")({
  loader: ({ params }) => {
    const film = getFilm(params.slug);
    return { film: film ?? null, slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.film) {
      return {
        meta: [
          { title: "Film not found | Mageye" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { film } = loaderData;
    return {
      meta: [
        { title: `${film.name} (${film.year}) | Mageye` },
        { name: "description", content: film.logline },
        { property: "og:title", content: `${film.name} (${film.year})` },
        { property: "og:description", content: film.logline },
        { property: "og:type", content: "video.movie" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: FilmNotFound,
  component: FilmDetail,
});

function FilmNotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="film-detail">
        <h1>Film not found</h1>
        <p className="film-logline">This film isn’t in the collection.</p>
        <Link className="button button-dark" to="/films">Back to films</Link>
      </section>
      <SiteFooter />
    </main>
  );
}

function FilmDetail() {
  const loaderData = Route.useLoaderData();
  const { content, loaded } = useSiteContent();
  const all: FilmItem[] = [...content.films, ...content.upcoming];
  const film = all.find((f) => f.slug === loaderData.slug) ?? (loaderData.film as FilmItem | null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  if (!film) {
    return loaded ? <FilmNotFound /> : null;
  }

  const related = (all.length ? all : allFilms).filter((item) => item.slug !== film.slug).slice(0, 4);

  return (
    <main>
      <SiteHeader />

      <section className="film-detail">
        <Link className="film-back" to="/films"><ArrowLeft size={15} /> All films</Link>
        <div className="film-detail-grid">
          <div className="film-detail-media">
            <img
              src={film.image}
              alt={`${film.name} film still`}
              width={1200}
              height={675}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <span className="film-item-play"><Play size={22} /></span>
          </div>
          <div className="film-detail-copy">
            {film.status && <span className="upcoming-status static">{film.status}</span>}
            <h1>{film.name}</h1>
            <p className="film-meta">{film.runtime} · {film.year} · {film.genre}</p>
            <p className="film-logline">{film.logline}</p>
            <p>{film.synopsis}</p>
            <dl className="film-facts">
              <div><dt>Cast</dt><dd>{(film.cast ?? []).join(", ")}</dd></div>
              <div><dt>Genre</dt><dd>{film.genre}</dd></div>
              <div><dt>Release</dt><dd>{film.year}</dd></div>
            </dl>
            <div className="film-detail-actions">
              {film.status ? (
                <button
                  type="button"
                  className="film-btn film-btn-ghost"
                  onClick={() => setTrailerOpen(true)}
                >
                  <Play size={13} /> Trailer
                </button>
              ) : (
                <>
                  <Link
                    className="film-btn film-btn-primary"
                    to="/watch/$slug"
                    params={{ slug: film.slug }}
                    search={{ kind: "film" }}
                  >
                    <Play size={13} /> Watch now
                  </Link>
                  <button
                    type="button"
                    className="film-btn film-btn-ghost"
                    onClick={() => setTrailerOpen(true)}
                  >
                    <Play size={13} /> Trailer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="films-list films-list-muted" aria-labelledby="more-films">
        <h2 id="more-films" className="films-section-title">More films</h2>
        <div className="films-grid">
          {related.map((item) => (
            <article className="film-item" key={item.slug}>
              <Link
                className="film-item-thumb"
                to="/films/$slug"
                params={{ slug: item.slug }}
                aria-label={`${item.name} details`}
              >
                <img
                  src={item.image}
                  alt={`${item.name} film still`}
                  width={900}
                  height={506}
                  loading="lazy" decoding="async" fetchPriority="low"
                />
                <span className="film-item-play"><Play size={18} /></span>
              </Link>
              <h3>
                <Link to="/films/$slug" params={{ slug: item.slug }}>{item.name}</Link>
              </h3>
              <p className="film-meta">{item.runtime} · {item.year}</p>
            </article>
          ))}
        </div>
      </section>

      <PlayerModal
        slug={trailerOpen ? film.slug : null}
        title={film.name}
        poster={film.image}
        onClose={() => setTrailerOpen(false)}
      />

      <SiteFooter />
    </main>
  );
}
