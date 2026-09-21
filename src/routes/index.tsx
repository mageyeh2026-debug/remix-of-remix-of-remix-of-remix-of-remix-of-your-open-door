import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  MonitorPlay,
  Play,
  Video,
  Wrench,
} from "lucide-react";

import { hideBrokenImage } from "@/lib/utils";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PlayerModal } from "@/components/PlayerModal";
import { useSiteContent } from "@/hooks/useSiteContent";

import contactBackground from "@/assets/hassan-mageye-coming-soon.avif";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mageye | Films by Hassan Mageye" },
      {
        name: "description",
        content:
          "Cinematic films by Hassan Mageye, a Ugandan/American writer, director and producer telling African stories with heart.",
      },
      { property: "og:title", content: "Mageye | Films by Hassan Mageye" },
      {
        property: "og:description",
        content: "African stories, cultural identity and character-driven drama.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const iconMap: Record<string, typeof Play> = {
  Building2,
  Video,
  MonitorPlay,
  Play,
  Clapperboard,
  Wrench,
};

const upcomingDetails: Record<
  string,
  { genre: string; synopsis: string; support: string }
> = {
  "the-silence-we-flee": {
    genre: "Drama | Thriller | International",
    synopsis:
      "After fleeing her homeland with evidence connected to her father’s murder, a young woman seeks safety in America—only to discover that distance cannot silence the forces hunting her. The Silence We Flee is a tense drama about survival, displacement, truth, and the price of carrying a secret across borders.",
    support:
      "Help us complete the film and bring it to audiences worldwide. Your support helps us take this story from production to the screen.",
  },
  "modern-road": {
    genre: "Drama | Human Story | Contemporary",
    synopsis:
      "The Modern Road explores the lives, choices, and struggles of people navigating a rapidly changing world, where ambition, relationships, and survival collide. It is a human story about the roads we choose, the people we meet along the way, and the consequences that follow us.",
    support:
      "Help us bring The Modern Road to life. Your support helps move this story from vision to screen.",
  },
  "john-bullock": {
    genre: "Psychological Thriller | Drama",
    synopsis:
      "A young African student takes a caregiving job inside a quiet family home, where locked doors, strange routines, and a mother’s obsessive control begin to reveal something deeply unsettling. John Bullock is a psychological thriller about family, control, memory, and the terrifying things people can justify in the name of love.",
    support:
      "Become part of our next production. Your support helps us move John Bullock from script to screen.",
  },
};

const supportLevels = [
  { amount: "$25", label: "Supporter", className: "support-tier-base" },
  { amount: "$50", label: "Film Friend", className: "support-tier-friend" },
  { amount: "$100", label: "Production Supporter", className: "support-tier-production" },
] as const;

function supportMailto(email: string, film: string, level: string) {
  const subject = encodeURIComponent(`${level} — ${film}`);
  const body = encodeURIComponent(`I would like to support ${film} as a ${level}. Please send me the next steps.`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function ProjectCard({
  project,
  slug,
  index,
  activeIndex,
  onActivate,
  onTrailer,
}: {
  project: { image: string; name: string; type: string };
  slug: string;
  index: number;
  activeIndex: number | null;
  onActivate: (index: number) => void;
  onTrailer: (slug: string) => void;
}) {
  const active = activeIndex === index;
  return (
    <Link
      className={`project-card${active ? " is-active" : ""}`}
      to="/films/$slug"
      params={{ slug }}
      onClick={(e) => {
        if (
          typeof window !== "undefined" &&
          (window.matchMedia("(hover: none)").matches ||
            window.matchMedia("(max-width: 720px)").matches) &&
          !active
        ) {
          e.preventDefault();
          onActivate(index);
        }
      }}
    >
      <span className="project-thumb">
        <img
          src={project.image}
          alt={`${project.name} — ${project.type}`}
          width={900}
          height={506}
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 4 ? "high" : "low"}
          onError={hideBrokenImage}
        />
        <span className="project-overlay">
          <span className="project-actions">
            <span
              className="film-btn film-btn-primary"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/watch/${slug}?kind=film`;
              }}
            >
              <Play size={13} /> Watch now
            </span>
            <span
              className="film-btn film-btn-ghost"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTrailer(slug);
              }}
            >
              <Play size={13} /> Trailer
            </span>
          </span>
        </span>
      </span>
      <span className="project-label">
        <strong>{project.name}</strong>
      </span>
    </Link>
  );
}

function Index() {
  const { content } = useSiteContent();
  const projectRailRef = useRef<HTMLDivElement>(null);
  const upcomingRailRef = useRef<HTMLDivElement>(null);
  const [activeFilm, setActiveFilm] = useState<number | null>(null);
  const [trailerSlug, setTrailerSlug] = useState<string | null>(null);

  const films = content.films;
  const projects = films.map((film) => ({
    image: film.image,
    name: film.name,
    type: film.genre,
    slug: film.slug,
  }));
  const galleryPreview = content.gallery.items.slice(0, 8);
  const trailerFilm = films.find((f) => f.slug === trailerSlug);

  const scrollRail = (rail: HTMLDivElement | null, direction: -1 | 1) => {
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth, behavior: "smooth" });
  };

  const scrollProjects = (direction: -1 | 1) => scrollRail(projectRailRef.current, direction);

  // The rail must always start at the first uploaded film. Scroll snapping can
  // pull it sideways when films load in, so pin it back to the start.
  useEffect(() => {
    projectRailRef.current?.scrollTo({ left: 0 });
  }, [films.length]);

  return (

    <main id="home">
      <SiteHeader />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-image" aria-hidden="true">
          <img
            src={content.hero.image}
            alt="Hassan Mageye, writer, director and producer"
            width={1400}
            height={950}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="hero-copy">
          <p className="eyebrow hero-name">{content.hero.eyebrow}</p>
          <h1 id="hero-title">{content.hero.title}</h1>
          <p className="hero-intro">{content.hero.intro1}</p>
          <p className="hero-intro">{content.hero.intro2}</p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/films">{content.hero.primaryLabel}</Link>
            <Link className="button button-light" to="/about">{content.hero.secondaryLabel}</Link>
            <Link className="button button-light" to="/contact">{content.hero.tertiaryLabel}</Link>
          </div>
        </div>
      </section>


      <section className="portfolio-section" id="portfolio">
        <h2 className="portfolio-title">{content.moviesHeading}</h2>
        <div className="project-carousel">
          <button className="carousel-arrow carousel-arrow-left" type="button" aria-label="Previous films" onClick={() => scrollProjects(-1)}>
            <ChevronLeft size={24} />
          </button>
          <div className="project-grid" id="portfolio-grid" ref={projectRailRef}>
            {projects.map((project, index) => (
              <ProjectCard
                key={`${project.slug}-${index}`}
                project={project}
                slug={project.slug}
                index={index}
                activeIndex={activeFilm}
                onActivate={setActiveFilm}
                onTrailer={setTrailerSlug}
              />
            ))}
            <Link className="more-card" to="/films" aria-label="See all films">
                <span className="more-thumb" aria-hidden="true">
                  <Play size={22} />
                </span>
                <span className="project-label">
                  <strong>More films</strong>
                </span>
            </Link>
          </div>
          <button className="carousel-arrow carousel-arrow-right" type="button" aria-label="Next films" onClick={() => scrollProjects(1)}>
            <ChevronRight size={24} />
          </button>
        </div>
      </section>

      <section className="upcoming-section" id="upcoming" aria-labelledby="upcoming-title">
        <div className="upcoming-heading">
          <p className="eyebrow"><span>{content.upcomingHeading.eyebrow}</span></p>
          <h2 id="upcoming-title">{content.upcomingHeading.title}</h2>
          <p className="upcoming-tagline">New stories. Bigger impact.</p>
        </div>
        <div className="upcoming-carousel">
          <button className="carousel-arrow carousel-arrow-left rail-arrow" type="button" aria-label="Previous upcoming projects" onClick={() => scrollRail(upcomingRailRef.current, -1)}>
            <ChevronLeft size={20} />
          </button>
          <div className="upcoming-grid" ref={upcomingRailRef}>
            {content.upcoming.map((project, index) => {
              const detail = upcomingDetails[project.slug];
              const synopsis = detail?.synopsis ?? project.synopsis;
              const genre = detail?.genre ?? project.genre;
              const support = detail?.support ?? `Help us bring ${project.name} to life and move this story from vision to screen.`;
              return (
              <article className="upcoming-card" key={project.slug}>
                <div className="upcoming-thumb">
                  <img
                    src={project.image}
                    alt={`${project.name} — upcoming film still`}
                    width={1200}
                    height={675}
                    loading="eager" decoding="async" fetchPriority={index < 3 ? "high" : "auto"}
                    onError={hideBrokenImage}
                  />
                  <span className="upcoming-status">{project.status ?? "Coming soon"}</span>
                </div>
                <div className="upcoming-copy">
                  <h3>{project.name}</h3>
                  <p className="upcoming-genre">{genre}</p>
                  <p className="upcoming-synopsis">{synopsis}</p>
                  <div className="upcoming-support">
                    <h4>Support this film</h4>
                    <p>{support}</p>
                    <div className="support-options">
                      {supportLevels.map((level) => (
                        <a
                          className={`support-tier ${level.className}`}
                          href={supportMailto(content.contact.email, project.name, `${level.amount} ${level.label}`)}
                          key={level.amount}
                        >
                          <strong>{level.amount}</strong>
                          <span>{level.label}</span>
                        </a>
                      ))}
                      <a
                        className="support-tier support-tier-follow"
                        href={supportMailto(content.contact.email, project.name, "Follow for free")}
                      >
                        <strong>Follow for free</strong>
                        <span>Get film updates</span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );})}
          </div>
          <button className="carousel-arrow carousel-arrow-right rail-arrow" type="button" aria-label="Next upcoming projects" onClick={() => scrollRail(upcomingRailRef.current, 1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <section className="services-section services-intro-section" id="services">
        <div className="services-intro">
          <p className="eyebrow">{content.services.eyebrow}</p>
          <h2 id="services-title">{content.services.title}</h2>
          <p className="services-lede">{content.services.lede}</p>
          <a className="button button-dark" href="#contact">{content.services.buttonLabel}</a>
        </div>
      </section>

      <section className="services-section services-cards-section">
        <div className="services">
          {content.services.items.map((item) => {
            const Icon = iconMap[item.icon] ?? Play;
            return (
              <article className="service" key={item.id}>
                <Icon aria-hidden="true" size={30} strokeWidth={1.35} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="gallery-section" id="gallery" aria-labelledby="gallery-title">
        <p className="eyebrow">{content.gallery.eyebrow}</p>
        <h2 id="gallery-title">{content.gallery.title}</h2>
        <p className="awards-text">{content.gallery.description}</p>
        <div className="home-photo-strip home-photo-strip-portrait" aria-hidden="true">
          {galleryPreview.map((photo) => (
            <img key={photo.id} src={photo.src} alt={photo.alt} loading="lazy" decoding="async" fetchPriority="low" onError={hideBrokenImage} />
          ))}
        </div>
        <Link className="button button-dark" to="/gallery">{content.gallery.buttonLabel}</Link>
      </section>

      <section className="awards-section" id="media" aria-labelledby="media-title">
        <p className="eyebrow">{content.media.eyebrow}</p>
        <h2 id="media-title">{content.media.title}</h2>
        <p className="awards-text">{content.media.description}</p>
        <div className="media-grid">
          {content.media.items.map((card) => {
            const body = (
              <>
                <img src={card.src} alt={card.alt} loading="lazy" decoding="async" fetchPriority="low" onError={hideBrokenImage} />
                <span className="media-card-overlay">
                  <span className="media-card-meta">{card.meta}</span>
                  <strong className="media-card-title">{card.title}</strong>
                </span>
              </>
            );
            return card.link ? (
              <a
                className="media-card media-card-link"
                key={card.id}
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {body}
              </a>
            ) : (
              <article className="media-card" key={card.id}>{body}</article>
            );
          })}
        </div>
        <a className="button button-dark" href={`mailto:${content.contact.email}`}>{content.media.buttonLabel}</a>
      </section>


      <section
        className="contact-section"
        id="contact"
        style={{ "--contact-bg": `url(${contactBackground})` } as React.CSSProperties}
      >
        <BriefcaseBusiness size={28} strokeWidth={1.3} aria-hidden="true" />
        <p className="eyebrow">{content.contact.eyebrow}</p>
        <h2>{content.contact.title}</h2>
        <p className="contact-lede">{content.contact.lede}</p>
        <a className="button button-light-on-dark" href={`mailto:${content.contact.email}`}>
          {content.contact.buttonLabel}
        </a>
      </section>

      <PlayerModal
        slug={trailerSlug}
        title={trailerFilm?.name}
        poster={trailerFilm?.image}
        onClose={() => setTrailerSlug(null)}
      />

      <SiteFooter />
    </main>
  );
}
