/** Official profiles for Hassan Mageye, shown after the contact section. */
export const socialProfiles = [
  {
    name: "IMDb",
    href: "https://www.imdb.com/name/nm8849868/",
    className: "social-imdb",
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" focusable="false">
        <rect width="64" height="32" rx="5" fill="#F5C518" />
        <path
          fill="#000"
          d="M8 8h5v16H8V8zm7 0h7l1.6 8.2L25.2 8h7v16h-4.6V13.6L25.5 24h-3.2l-2.1-10.4V24H15V8zm19 0h6.3c3.7 0 5 1.5 5 4.6v6.8c0 3.1-1.3 4.6-5 4.6H34V8zm4.7 3.2v9.6c1.2 0 1.9-.2 1.9-1.7v-6.2c0-1.5-.7-1.7-1.9-1.7zM47 8h4.5v5.4c.7-.8 1.6-1.2 2.7-1.2 2 0 3 1.1 3 3.4v5.3c0 2.3-1 3.4-3 3.4-1.1 0-2-.4-2.7-1.3l-.3 1H47V8zm4.5 7.8v4.9c0 .7.2 1 .7 1s.7-.3.7-1v-4.9c0-.7-.2-1-.7-1s-.7.3-.7 1z"
        />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/hassan_mageye/",
    className: "social-instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="ig-grad" cx="30%" cy="107%" r="140%">
            <stop offset="0%" stopColor="#FDF497" />
            <stop offset="25%" stopColor="#FD5949" />
            <stop offset="60%" stopColor="#D6249F" />
            <stop offset="100%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
        <path
          fill="#fff"
          d="M12 6.8A5.2 5.2 0 1 0 17.2 12 5.2 5.2 0 0 0 12 6.8zm0 8.6A3.4 3.4 0 1 1 15.4 12 3.4 3.4 0 0 1 12 15.4zM17.4 5.4a1.2 1.2 0 1 0 1.2 1.2 1.2 1.2 0 0 0-1.2-1.2z"
        />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/Africancinemaa/",
    className: "social-facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M15.1 12.6h-2v6.9h-2.9v-6.9H8.7v-2.5h1.5V8.6c0-2 .9-3.2 3.2-3.2h2v2.5h-1.2c-.9 0-.9.3-.9 1v1.2h2.1l-.3 2.5z"
        />
      </svg>
    ),
  },
  {
    name: "Prime Video",
    href: "https://www.amazon.com/prime-video/actor/Mageye-Hassan/amzn1.dv.gti.dcd37e3e-852b-4efb-b65a-4cd1d0f4c7e0/",
    className: "social-prime",
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" focusable="false">
        <rect width="64" height="32" rx="5" fill="#00A8E1" />
        <text
          x="32"
          y="21"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fontFamily="Onest, Arial, sans-serif"
          fill="#0F1111"
        >
          prime
        </text>
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/hassan-mageye-598b83177",
    className: "social-linkedin",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path
          fill="#fff"
          d="M7.1 9.6H4.7V19h2.4V9.6zM5.9 5.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM19.3 13.5c0-2.6-1.4-3.9-3.3-3.9a2.8 2.8 0 0 0-2.6 1.4V9.6H11V19h2.4v-5c0-1.3.6-2 1.7-2s1.6.7 1.6 2v5h2.6v-5.5z"
        />
      </svg>
    ),
  },
] as const;

export function SocialProfiles() {
  return (
    <section className="social-section" aria-labelledby="social-title">
      <p className="eyebrow">Follow Hassan Mageye</p>
      <h2 id="social-title">Social profiles</h2>
      <div className="social-grid">
        {socialProfiles.map((profile) => (
          <a
            key={profile.name}
            className={`social-link ${profile.className}`}
            href={profile.href}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={`Hassan Mageye on ${profile.name}`}
          >
            <span className="social-icon">{profile.icon}</span>
            <span>{profile.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
