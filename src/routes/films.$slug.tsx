import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PlayerModal, prefetchTrailer } from "@/components/PlayerModal";
import { SupportPayModal } from "@/components/PayModal";
import { useSiteContent } from "@/hooks/useSiteContent";
import { supportLevels, upcomingDetails } from "@/lib/upcoming-copy";
import type { FilmItem } from "@/lib/site-content";

const SITE_URL = "https://hassanmageye.com";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/films/$slug")({
  head: ({ params }) => {
    const name = titleFromSlug(params.slug);
    const title = `${name} | A film by Hassan Mageye`;
    const description = `${name} — watch the trailer, read the story and stream this film by director Hassan Mageye.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: `${SITE_URL}/films/${params.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/films/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Movie",
            name,
            url: `${SITE_URL}/films/${params.slug}`,
            director: { "@type": "Person", name: "Hassan Mageye", url: SITE_URL },
            producer: { "@type": "Person", name: "Hassan Mageye", url: SITE_URL },
          }),
        },
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
  const { slug } = Route.useParams();
  const { content, loaded } = useSiteContent();
  const all: FilmItem[] = [...content.films, ...content.upcoming];
  const film = all.find((f) => f.slug === slug) ?? null;
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [supportAmount, setSupportAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");


  // Warm the playback link while the page is being read, so the trailer starts
  // as soon as the button is pressed.
  useEffect(() => {
    prefetchTrailer(film?.slug ?? null);
  }, [film?.slug]);

  if (!film) {
    return loaded ? <FilmNotFound /> : null;
  }

  const related = all.filter((item) => item.slug !== film.slug).slice(0, 4);
  const detail = upcomingDetails[film.slug];
  const isUpcoming = Boolean(film.status);
  const synopsis = detail?.synopsis ?? film.synopsis;
  const genre = detail?.genre ?? film.genre;
  const supportCopy =
    detail?.support ?? `Help us bring ${film.name} to life and move this story from vision to screen.`;
  const customValue = Math.round(Number(customAmount) * 100) / 100;

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
            <p className="film-meta">{film.runtime} · {film.year} · {genre}</p>
            <p className="film-logline">{film.logline}</p>
            <p>{synopsis}</p>
            <dl className="film-facts">
              <div><dt>Cast</dt><dd>{(film.cast ?? []).join(", ")}</dd></div>
              <div><dt>Genre</dt><dd>{genre}</dd></div>
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

        {isUpcoming ? (
          <div className="upcoming-support detail-support">
            <h2>Support this film</h2>
            <p>{supportCopy}</p>
            <div className="support-options">
              {supportLevels.map((level) => (
                <button
                  type="button"
                  className={`support-tier ${level.className}`}
                  onClick={() => setSupportAmount(level.amountUsd)}
                  key={level.amount}
                >
                  <strong>{level.amount}</strong>
                  <span>{level.label}</span>
                </button>
              ))}
            </div>
            <form
              className="support-custom"
              onSubmit={(e) => {
                e.preventDefault();
                if (customValue >= 1) setSupportAmount(customValue);
              }}
            >
              <label htmlFor="support-amount">Support with any amount (USD)</label>
              <div className="support-custom-row">
                <input
                  id="support-amount"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                />
                <button className="film-btn film-btn-primary" type="submit" disabled={!(customValue >= 1)}>
                  Support
                </button>
              </div>
            </form>
          </div>
        ) : null}
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
