import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://hassanmageye.com";
const DB_URL = "https://mageye-hassan-8a3ee-default-rtdb.firebaseio.com/site.json";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/films", priority: "0.9", changefreq: "hourly" },
  { path: "/gallery", priority: "0.8", changefreq: "hourly" },
  { path: "/about", priority: "0.8", changefreq: "hourly" },
  { path: "/contact", priority: "0.7", changefreq: "hourly" },
];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c,
  );
}

/** Film pages come from the dashboard content, so new uploads are indexed too. */
async function filmPaths(): Promise<string[]> {
  try {
    const response = await fetch(DB_URL, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      films?: Array<{ slug?: string }>;
      upcoming?: Array<{ slug?: string }>;
    } | null;
    const slugs = [...(data?.films ?? []), ...(data?.upcoming ?? [])]
      .map((film) => film?.slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
    return Array.from(new Set(slugs)).map((slug) => `/films/${slug}`);
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const films = await filmPaths();
        const entries = [
          ...STATIC_PATHS.map(
            (entry) =>
              `<url><loc>${SITE_URL}${entry.path}</loc><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`,
          ),
          ...films.map(
            (path) =>
              `<url><loc>${escapeXml(SITE_URL + path)}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`,
          ),
        ].join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
          {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          },
        );
      },
    },
  },
});
