import { createFileRoute, Link } from "@tanstack/react-router";
import { Award } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import hassanImage from "@/assets/hassan-mageye.png";
import hassanDesktopImage from "@/assets/director-hero-2.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Mageye | Hassan Mageye, Filmmaker" },
      {
        name: "description",
        content:
          "Meet Hassan Mageye, a Ugandan/American writer, director and producer telling African stories and character-driven drama.",
      },
      { property: "og:title", content: "About Mageye | Hassan Mageye, Filmmaker" },
      {
        property: "og:description",
        content: "The story, the approach and the awards behind the films.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const awards = [
  { year: "2026", title: "Best Documentary Short", org: "Melbourne Film Festival" },
  { year: "2025", title: "Gold — Cinematography", org: "Australian Video Awards" },
  { year: "2025", title: "Audience Choice", org: "Coastal Film Week" },
  { year: "2024", title: "Best Brand Story", org: "APAC Content Awards" },
];

function AboutPage() {
  return (
    <main>
      <SiteHeader />

      <section className="about-section" id="about">
        <div className="about-image">
          <img className="about-img-desktop" src={hassanDesktopImage} alt="Hassan Mageye, writer, director and producer" />
          <img className="about-img-mobile" src={hassanImage} alt="Hassan Mageye, writer, director and producer" width={1400} height={950} />
        </div>
        <div className="about-copy">
          <p className="eyebrow">Hi, I’m Hassan</p>
          <h1>Ugandan/American writer, director and producer.</h1>
          <p>
            Hassan Mageye is a Ugandan/American writer, director and producer whose filmmaking career
            spans more than a decade. He studied Mass Communication at Makerere University and moved
            from an early interest in journalism toward filmmaking.
          </p>
          <p>
            His work has focused on African stories, cultural identity, social themes and
            character-driven drama. Hassan currently resides in California.
          </p>
          <div className="about-actions">
            <Link className="button button-dark" to="/films">Watch the films</Link>
            <Link className="button button-light" to="/contact">Contact</Link>
          </div>
        </div>
      </section>

      <section className="awards-section" id="awards" aria-labelledby="awards-title">
        <p className="eyebrow">Recognition</p>
        <h2 id="awards-title">Awards &amp; winnings</h2>
        <div className="awards-grid">
          {awards.map((award) => (
            <article className="award" key={award.title}>
              <Award size={26} strokeWidth={1.3} aria-hidden="true" />
              <strong>{award.title}</strong>
              <span>{award.org}</span>
              <small>{award.year}</small>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
