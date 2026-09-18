import { createFileRoute } from "@tanstack/react-router";
import { BriefcaseBusiness, Mail, MapPin, Phone } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { useSiteContent } from "@/hooks/useSiteContent";
import contactBackground from "@/assets/hassan-mageye-coming-soon.avif";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Mageye" },
      {
        name: "description",
        content:
          "Get in touch with Mageye to plan a wedding film, brand video, event coverage or documentary.",
      },
      { property: "og:title", content: "Contact | Mageye" },
      {
        property: "og:description",
        content: "Have a story to tell? Let’s create something that matters.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { content } = useSiteContent();
  const c = content.contact;
  const details = [
    { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { icon: Phone, label: "Phone", value: c.phone, href: `tel:${c.phone.replace(/\s+/g, "")}` },
    { icon: MapPin, label: "Based in", value: c.location },
  ];

  return (
    <main>
      <SiteHeader />

      <section
        className="contact-section"
        id="contact"
        style={{ "--contact-bg": `url(${contactBackground})` } as React.CSSProperties}
      >
        <BriefcaseBusiness size={28} strokeWidth={1.3} aria-hidden="true" />
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <a className="button button-light-on-dark" href={`mailto:${c.email}`}>Send an email</a>
      </section>

      <section className="awards-section" aria-labelledby="contact-details-title">
        <p className="eyebrow">Get in touch</p>
        <h2 id="contact-details-title">Contact details</h2>
        <div className="awards-grid">
          {details.map(({ icon: Icon, label, value, href }) => (
            <article className="award" key={label}>
              <Icon size={26} strokeWidth={1.3} aria-hidden="true" />
              <strong>{label}</strong>
              {href ? <a href={href}>{value}</a> : <span>{value}</span>}
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
