import kimoteImage from "@/assets/kimote.jpg";
import galzAboutImage from "@/assets/galz-about.jpg";
import kingsVirginImage from "@/assets/kings-virgin.jpg";
import bedroomChainImage from "@/assets/bedroom-chain.jpg";
import devilsChestImage from "@/assets/devils-chest-poster.jpg";
import devilsChestBanner from "@/assets/devils-chest-banner.png";
import tinkasStoryImage from "@/assets/tinkas-story.jpg";
import upcomingSilence from "@/assets/silence-we-flee.avif";
import upcomingBullock from "@/assets/john-bullock.avif";
import upcomingModernRoad from "@/assets/modern-road.avif";
import directorHeroImage from "@/assets/director-hero.png";
import directorHero2 from "@/assets/director-hero-2.png";
import hassanImage from "@/assets/hassan-mageye.png";
import behindCouple from "@/assets/behind-scene-couple.jpg";
import behindDirecting from "@/assets/behind-scene-directing.jpg";
import behindSet from "@/assets/behind-scene-set.jpg";
import behindTailor from "@/assets/behind-scene-tailor.jpg";
import behindWalk from "@/assets/behind-scene-walk.jpg";
import filmsBanner from "@/assets/films-banner.jpg";
import projectEvent from "@/assets/project-event.jpg";
import projectProduct from "@/assets/project-product.jpg";
import projectStudio from "@/assets/project-studio.jpg";
import projectWedding from "@/assets/project-wedding.jpg";
import upcomingLaneway from "@/assets/upcoming-laneway.jpg";
import upcomingLongway from "@/assets/upcoming-longway.jpg";
import upcomingSaltstone from "@/assets/upcoming-saltstone.jpg";
import videographerHero from "@/assets/videographer-hero.jpg";

export type FilmItem = {
  slug: string;
  name: string;
  year: string;
  runtime: string;
  genre: string;
  image: string;
  logline: string;
  synopsis: string;
  cast: string[];
  status?: string;
  videoUrl?: string;
  trailerUrl?: string;
  price?: number;
};

export type GalleryItem = { id: string; src: string; alt: string; title: string };
export type MediaItem = { id: string; src: string; alt: string; meta: string; title: string; link?: string };
export type ServiceItem = { id: string; icon: string; title: string; text: string };

export type WalletTransaction = {
  id: string;
  date: string;
  type: "sale" | "withdrawal" | "adjustment";
  description: string;
  amount: number;
  status: "completed" | "pending" | "failed";
};

export type SiteContent = {
  integrations: {
    paymentBackendUrl: string;
    uploadBackendUrl: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    intro1: string;
    intro2: string;
    image: string;
    primaryLabel: string;
    secondaryLabel: string;
    tertiaryLabel: string;
  };
  moviesHeading: string;
  films: FilmItem[];
  upcomingHeading: { eyebrow: string; title: string };
  upcoming: FilmItem[];
  services: { eyebrow: string; title: string; lede: string; buttonLabel: string; items: ServiceItem[] };
  gallery: { eyebrow: string; title: string; description: string; buttonLabel: string; items: GalleryItem[] };
  media: { eyebrow: string; title: string; description: string; buttonLabel: string; items: MediaItem[] };
  contact: {
    eyebrow: string;
    title: string;
    lede: string;
    email: string;
    phone: string;
    location: string;
    buttonLabel: string;
  };
  wallet: { currency: string; balance: number; transactions: WalletTransaction[] };
};

export const defaultContent: SiteContent = {
  integrations: {
    paymentBackendUrl: "https://function-bun-production-e268.up.railway.app",
    uploadBackendUrl: "https://function-bun-production-9a7c.up.railway.app",
  },
  hero: {
    eyebrow: "Hassan Mageye",
    title: "Ugandan/American writer, director and producer.",
    intro1:
      "Hassan Mageye is a Ugandan/American writer, director and producer whose filmmaking career spans more than a decade. He studied Mass Communication at Makerere University and moved from an early interest in journalism toward filmmaking.",
    intro2:
      "His work has focused on African stories, cultural identity, social themes and character-driven drama. Hassan currently resides in California.",
    image: directorHeroImage,
    primaryLabel: "Watch the films",
    secondaryLabel: "More about Hassan",
    tertiaryLabel: "Contact",
  },
  moviesHeading: "Watch movies here",
  films: [
    {
      slug: "kimote",
      name: "Kimote",
      year: "",
      runtime: "Film",
      genre: "Drama | Thriller | International",
      image: kimoteImage,
      logline: "A cloth that tells our tale.",
      synopsis: "Kimote, written by Can Themba and directed by Darrell J. Roodt.",
      cast: ["Sbu Nkosi", "Kenneth Nkosi"],
      price: 5.99,
    },
    {
      slug: "galz-about",
      name: "Galz About",
      year: "",
      runtime: "Film",
      genre: "Drama",
      image: galzAboutImage,
      logline: "A New Cinema Production film.",
      synopsis: "Galz About, presented by New Cinema Production.",
      cast: ["Bonzila", "Gaetsewe Kama", "Luthuli Faraga", "Denti"],
      price: 5.99,
    },
    {
      slug: "kings-virgin",
      name: "King's Virgin",
      year: "",
      runtime: "Film",
      genre: "Drama",
      image: kingsVirginImage,
      logline: "A Mageye Hassan film.",
      synopsis: "King's Virgin, written and directed by Mageye Hassan.",
      cast: ["Namikaga Pedro", "Prince Joe Nakibeni", "Nakanyike Joan", "Namwinge Sophian"],
      price: 5.99,
    },
    {
      slug: "bedroom-chain",
      name: "Bedroom Chain",
      year: "",
      runtime: "Film",
      genre: "Drama",
      image: bedroomChainImage,
      logline: "Written and directed by Alan Uwadzi.",
      synopsis: "Bedroom Chain, a Kalmay production.",
      cast: ["Mima Kalmma", "Makenya Joanna Jozo", "Lewis Lukhon", "Jerry Roberts", "Sarah Isaac"],
      price: 5.99,
    },
    {
      slug: "devils-chest",
      name: "Devil's Chest",
      year: "",
      runtime: "Film",
      genre: "Historical drama",
      image: devilsChestImage,
      logline: "The story of the Women's Army in the freedom struggle.",
      synopsis:
        "A Mageye Hassan film inspired by the true story of Joseph Kony (LRA) and the affliction of women.",
      cast: ["Musaba Samuel", "Nande Nakitende"],
      price: 5.99,
    },
    {
      slug: "tinkas-story",
      name: "Tinka's Story",
      year: "2022",
      runtime: "Film",
      genre: "Drama",
      image: tinkasStoryImage,
      logline: "Tinka the dead summoner.",
      synopsis:
        "Written and directed by Mageye Hassan. Official selection at The African Film Festival 2022.",
      cast: [
        "Kebirungi Agnes Knight",
        "Jeffroberts Walusimbi",
        "Tania S. Kankindi",
        "Jayant Maru",
        "Nakitende Hasifah",
      ],
      price: 5.99,
    },
  ],
  upcomingHeading: { eyebrow: "What’s next", title: "Upcoming projects" },
  upcoming: [
    {
      slug: "the-silence-we-flee",
      name: "The Silence We Flee",
      year: "",
      runtime: "Coming soon",
      genre: "Drama",
      image: upcomingSilence,
      status: "Coming soon",
      logline: "A woman on the run. A truth they will kill to bury.",
      synopsis:
        "After fleeing her homeland with evidence connected to her father’s murder, a young woman seeks safety in America—only to discover that distance cannot silence the forces hunting her. The Silence We Flee is a tense drama about survival, displacement, truth, and the price of carrying a secret across borders.",
      cast: ["Casting in progress"],
    },
    {
      slug: "modern-road",
      name: "Modern Road",
      year: "",
      runtime: "Coming soon",
      genre: "Drama | Human Story | Contemporary",
      image: upcomingModernRoad,
      status: "Coming soon",
      logline: "Some journeys change a nation.",
      synopsis:
        "The Modern Road explores the lives, choices, and struggles of people navigating a rapidly changing world, where ambition, relationships, and survival collide. It is a human story about the roads we choose, the people we meet along the way, and the consequences that follow us.",
      cast: ["Casting in progress"],
    },
    {
      slug: "john-bullock",
      name: "John Bullock",
      year: "",
      runtime: "Coming soon",
      genre: "Psychological Thriller | Drama",
      image: upcomingBullock,
      status: "Coming soon",
      logline: "An upcoming Mageye Global Works film.",
      synopsis:
        "A young African student takes a caregiving job inside a quiet family home, where locked doors, strange routines, and a mother’s obsessive control begin to reveal something deeply unsettling. John Bullock is a psychological thriller about family, control, memory, and the terrifying things people can justify in the name of love.",
      cast: ["Artists to be announced"],
    },
  ],
  services: {
    eyebrow: "What we do",
    title: "Services",
    lede: "Planning to shoot a film, documentary, commercial, music video or other production in Africa or Santa Rosa, California? We can help coordinate the local support you need to get your production moving.",
    buttonLabel: "Plan your shoot",
    items: [
      {
        id: "locations",
        icon: "Building2",
        title: "Locations",
        text: "Scouting and access to filming locations across Africa and Santa Rosa, California.",
      },
      {
        id: "crew",
        icon: "Video",
        title: "Local crew",
        text: "Experienced local camera, sound and production crews on the ground.",
      },
      {
        id: "permits",
        icon: "MonitorPlay",
        title: "Permit coordination",
        text: "Permits, clearances and paperwork handled so your shoot runs smoothly.",
      },
      {
        id: "support",
        icon: "Play",
        title: "Production support",
        text: "Logistics, transport and on-the-ground support from prep to wrap.",
      },
    ],
  },
  gallery: {
    eyebrow: "In pictures",
    title: "Gallery",
    description: "Behind-the-scenes moments, film stills and production photography.",
    buttonLabel: "Open full gallery",
    // Gallery pictures come from the dashboard only.
    items: [],
  },
  media: {
    eyebrow: "Recognition",
    title: "Media and news",
    description: "Awards and winnings from festivals across Africa and the United States.",
    buttonLabel: "Press inquiries",
    items: [
      {
        id: "m1",
        src: projectEvent,
        alt: "Best Film in an Indigenous Language — Uganda Film Festival",
        meta: "Uganda Film Festival · 2025",
        title: "Best Film in an Indigenous Language",
      },
      {
        id: "m2",
        src: behindWalk,
        alt: "Special Mention — Mashariki African Film Festival",
        meta: "Mashariki African Film Festival · 2025",
        title: "Special Mention",
      },
      {
        id: "m3",
        src: galzAboutImage,
        alt: "Official selection — Silicon Valley African Film Festival",
        meta: "Silicon Valley African Film Festival",
        title: "Official selection",
      },
      {
        id: "m4",
        src: filmsBanner,
        alt: "Uganda's official submission — 98th Academy Awards",
        meta: "98th Academy Awards",
        title: "Uganda's official submission",
      },
    ],
  },
  contact: {
    eyebrow: "Contact us",
    title: "Let’s create something that matters.",
    lede: "For film screenings, distribution, press, partnerships, and production inquiries.",
    email: "mageyeglobalworks@gmail.com",
    phone: "+61 400 000 000",
    location: "California, USA · Available worldwide",
    buttonLabel: "Contact us",
  },
  wallet: { currency: "USD", balance: 0, transactions: [] },
};

/**
 * Merge a stored snapshot over the defaults.
 * Once a snapshot exists in the database it is the single source of truth:
 * lists that were emptied in the dashboard stay empty instead of falling back
 * to the original content (which made deleted items reappear on the site).
 */
/**
 * Pictures saved by the dashboard can still point at a previous copy of this
 * site, whose asset links are not served here. Map those links back onto the
 * matching picture that ships with this project, by file name.
 */
const bundledPictures: Record<string, string> = {
  "kimote.jpg": kimoteImage,
  "galz-about.jpg": galzAboutImage,
  "kings-virgin.jpg": kingsVirginImage,
  "bedroom-chain.jpg": bedroomChainImage,
  "devils-chest-poster.jpg": devilsChestImage,
  "devils-chest-banner.png": devilsChestBanner,
  "tinkas-story.jpg": tinkasStoryImage,
  "silence-we-flee.png": upcomingSilence,
  "silence-we-flee.avif": upcomingSilence,
  "john-bullock.png": upcomingBullock,
  "john-bullock.avif": upcomingBullock,
  "modern-road.png": upcomingModernRoad,
  "modern-road.avif": upcomingModernRoad,
  "director-hero.png": directorHeroImage,
  "director-hero-2.png": directorHero2,
  "hassan-mageye.png": hassanImage,
  "behind-scene-couple.jpg": behindCouple,
  "behind-scene-directing.jpg": behindDirecting,
  "behind-scene-set.jpg": behindSet,
  "behind-scene-tailor.jpg": behindTailor,
  "behind-scene-walk.jpg": behindWalk,
};

for (const url of [
  filmsBanner,
  projectEvent,
  projectProduct,
  projectStudio,
  projectWedding,
  upcomingLaneway,
  upcomingLongway,
  upcomingSaltstone,
  videographerHero,
]) {
  const name = url.split("/").pop()?.replace(/-[A-Za-z0-9_]{6,}\./, ".");
  if (name) bundledPictures[name] ??= url;
}

/**
 * Dashboard poster links that ship with the site as optimized bundled files,
 * so visitors never re-download the heavy originals from remote storage.
 */
const bundledPosterUrls: Record<string, string> = {
  "https://pub-eb00261df49f466a9e5efee154650b48.r2.dev/images/ff6c0f1c-559b-4204-8d34-386f97390993-ChatGPT_Image_Sep_15__2026__12_24_00_PM.png":
    upcomingSilence,
  "https://pub-eb00261df49f466a9e5efee154650b48.r2.dev/films/6ef3dbb1-6f0c-4331-a0a2-d5ad999a303a-ChatGPT_Image_Sep_19__2026__11_27_20_AM.png":
    upcomingModernRoad,
  "https://pub-eb00261df49f466a9e5efee154650b48.r2.dev/films/2c7e41f2-2624-467b-90fc-dc8053e9bd4a-ChatGPT_Image_Sep_19__2026__11_27_13_AM.png":
    upcomingBullock,
};

export function resolvePicture<T>(value: T): T {
  if (typeof value !== "string") return value;
  const direct = bundledPosterUrls[value];
  if (direct) return direct as unknown as T;
  const legacyMatch = /^(?:https?:\/\/[^/]+)?\/__l5e\/assets-v1\/[^/]+\/(.+)$/.exec(value);
  const builtMatch = /(?:^|\/)assets\/([^/?#]+?)-[A-Za-z0-9_]{6,}(\.[A-Za-z0-9]+)(?:[?#].*)?$/.exec(value);
  const filename = legacyMatch?.[1]
    ? decodeURIComponent(legacyMatch[1])
    : builtMatch?.[1] && builtMatch[2]
      ? `${builtMatch[1]}${builtMatch[2]}`
      : null;
  if (!filename) return value;
  const local = bundledPictures[filename];
  return (local ?? value) as unknown as T;
}

export function mergeContent(stored: unknown): SiteContent {
  const base = JSON.parse(JSON.stringify(defaultContent)) as SiteContent;
  const s = stored && typeof stored === "object" ? stored as any : {};
  const arr = <T,>(v: unknown): T[] => {
    if (Array.isArray(v)) return v.filter(Boolean) as T[];
    if (v && typeof v === "object") return Object.values(v).filter(Boolean) as T[];
    return [];
  };
  const film = (f: FilmItem): FilmItem => ({
    ...f,
    cast: arr<string>(f.cast),
    image: resolvePicture(f.image),
  });
  const dashboardFilm = (f: FilmItem) =>
    [f.image, f.videoUrl, f.trailerUrl].some(
      (value) => typeof value === "string" && /^https?:\/\//i.test(value) && !value.includes("__l5e"),
    );

  return {
    integrations: { ...base.integrations, ...(s.integrations ?? {}) },
    hero: { ...base.hero, ...(s.hero ?? {}), image: resolvePicture(s.hero?.image ?? base.hero.image) },
    moviesHeading: s.moviesHeading ?? base.moviesHeading,
    // Public film lists only contain records with media uploaded or linked in
    // the dashboard. This permanently excludes the bundled sample catalogue.
    films: arr<FilmItem>(s.films).filter(dashboardFilm).map(film),
    upcomingHeading: { ...base.upcomingHeading, ...(s.upcomingHeading ?? {}) },
    upcoming: arr<FilmItem>(s.upcoming).filter(dashboardFilm).map(film),
    services: {
      ...base.services,
      ...(s.services ?? {}),
      items: arr<ServiceItem>(s.services?.items),
    },
    gallery: {
      ...base.gallery,
      ...(s.gallery ?? {}),
      // Only pictures actually uploaded through the dashboard; old sample
      // pictures must never reappear, not even while content is loading.
      items: arr<GalleryItem>(s.gallery?.items)
        .filter((i) => typeof i?.src === "string" && /^https?:\/\//i.test(i.src) && !i.src.includes("__l5e"))
        .map((i) => ({ ...i, src: resolvePicture(i.src) })),
    },
    media: {
      ...base.media,
      ...(s.media ?? {}),
      items: arr<MediaItem>(s.media?.items).map((i) => ({ ...i, src: resolvePicture(i.src) })),
    },
    contact: { ...base.contact, ...(s.contact ?? {}) },
    wallet: {
      ...base.wallet,
      ...(s.wallet ?? {}),
      transactions: arr<WalletTransaction>(s.wallet?.transactions),
    },
  };
}


/** Every image URL used anywhere on the site, for warm-up preloading. */
export function collectImageUrls(content: SiteContent): string[] {
  const urls = [
    // Warm dashboard-uploaded gallery pictures first so opening Gallery can
    // reuse them directly from the browser's memory cache.
    ...content.gallery.items.map((i) => i.src),
    content.hero.image,
    ...content.films.flatMap((f) => [f.image]),
    ...content.upcoming.map((f) => f.image),
    ...content.media.items.map((i) => i.src),
  ];
  return Array.from(new Set(urls.filter((u): u is string => typeof u === "string" && u.length > 0)));
}

