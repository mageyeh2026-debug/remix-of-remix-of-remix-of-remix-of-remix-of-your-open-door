// Server-only media sources. These URLs never reach the client bundle.
const SAMPLE =
  "https://pub-eb00261df49f466a9e5efee154650b48.r2.dev/media/admin/6f42ad8e-0620-48d9-8928-62cc0d1ca170-TINKA_S_STORY_OFFICIAL_TRAILER__1_.mp4";

export type Source = { url: string; type: "mp4" | "dash" | "hls" };

export function getTrailerSource(_slug: string): Source {
  return { url: SAMPLE, type: "mp4" };
}

export function getFilmSource(_slug: string): Source {
  return { url: SAMPLE, type: "mp4" };
}
