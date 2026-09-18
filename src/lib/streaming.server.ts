// Server-only media sources. These URLs never reach the client bundle: the
// player always talks to /api/public/stream/<token>, which proxies them.
import { firebaseConfig, SITE_PATH } from "./firebase";

export type Source = { url: string; type: "mp4" | "dash" | "hls" };

type StoredFilm = { slug?: string; name?: string; videoUrl?: string; trailerUrl?: string };

const CONTENT_URL = `${firebaseConfig.databaseURL}/${SITE_PATH}.json`;
const CACHE_MS = 30_000;

let cache: { at: number; films: StoredFilm[] } | null = null;

function list(value: unknown): StoredFilm[] {
  if (Array.isArray(value)) return value.filter(Boolean) as StoredFilm[];
  if (value && typeof value === "object") return Object.values(value).filter(Boolean) as StoredFilm[];
  return [];
}

/** "Tinka's Story" and "tinkas-story" must match the same film. */
function key(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function loadFilms(): Promise<StoredFilm[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.films;
  try {
    const response = await fetch(CONTENT_URL, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as Record<string, unknown> | null;
    const films = [...list(data?.["films"]), ...list(data?.["upcoming"])];
    cache = { at: Date.now(), films };
    return films;
  } catch (error) {
    console.warn("stream: could not read dashboard content", error);
    return cache?.films ?? [];
  }
}

async function findFilm(slug: string): Promise<StoredFilm | undefined> {
  const wanted = key(decodeURIComponent(slug));
  const films = await loadFilms();
  return films.find(
    (film) => key(film.slug ?? "") === wanted || key(film.name ?? "") === wanted,
  );
}

function usable(url: string | undefined): string | null {
  const trimmed = (url ?? "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function source(url: string): Source {
  const path = url.split("?")[0]!.toLowerCase();
  const type: Source["type"] = path.endsWith(".m3u8")
    ? "hls"
    : path.endsWith(".mpd")
      ? "dash"
      : "mp4";
  return { url, type };
}

/** Only the trailer the admin uploaded for this exact film — never another film's. */
export async function getTrailerSource(slug: string): Promise<Source | null> {
  const film = await findFilm(slug);
  const url = usable(film?.trailerUrl) ?? usable(film?.videoUrl);
  return url ? source(url) : null;
}

export async function getFilmSource(slug: string): Promise<Source | null> {
  const film = await findFilm(slug);
  const url = usable(film?.videoUrl) ?? usable(film?.trailerUrl);
  return url ? source(url) : null;
}

/** True when the dashboard has a real video (not just a trailer) for this film. */
export async function hasFilmVideo(slug: string): Promise<boolean> {
  const film = await findFilm(slug);
  return Boolean(usable(film?.videoUrl));
}
