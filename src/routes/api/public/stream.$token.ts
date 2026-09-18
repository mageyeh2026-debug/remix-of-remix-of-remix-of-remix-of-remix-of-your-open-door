import { createFileRoute } from "@tanstack/react-router";

async function proxy(request: Request, token: string, bodyless: boolean) {
  const { verifyPlaybackToken } = await import("@/lib/stream-token.server");
  const { getFilmSource, getTrailerSource } = await import("@/lib/streaming.server");

  const payload = await verifyPlaybackToken(token);
  if (!payload) {
    return new Response("Playback link expired", { status: 403 });
  }

  const source =
    payload.kind === "trailer"
      ? await getTrailerSource(payload.slug)
      : await getFilmSource(payload.slug);

  const range = request.headers.get("range");
  const upstream = await fetch(source.url, {
    headers: range ? { Range: range } : {},
    method: bodyless ? "HEAD" : "GET",
  });

  const headers = new Headers();
  for (const header of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // The browser refuses to play media whose type it cannot tell, so always
  // label the response, using the file type as the fallback.
  if (!headers.has("content-type")) {
    headers.set(
      "content-type",
      source.type === "hls"
        ? "application/vnd.apple.mpegurl"
        : source.type === "dash"
          ? "application/dash+xml"
          : "video/mp4",
    );
  }
  if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "no-store, no-cache, must-revalidate, private");
  headers.set("content-disposition", "inline");
  headers.set("x-content-type-options", "nosniff");

  return new Response(bodyless ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export const Route = createFileRoute("/api/public/stream/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => proxy(request, params.token, false),
      HEAD: async ({ request, params }) => proxy(request, params.token, true),
    },
  },
});
