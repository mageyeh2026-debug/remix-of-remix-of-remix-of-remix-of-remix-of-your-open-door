import { useEffect, useState } from "react";
import { onValue, ref, set } from "firebase/database";

import { firebaseDb, SITE_PATH } from "@/lib/firebase";
import { uploadToR2, type UploadProgress } from "@/lib/r2-upload";
import { collectImageUrls, mergeContent, type SiteContent } from "@/lib/site-content";

const CACHE_KEY = "mageye-site-content";
const EMPTY_LIVE_CONTENT = mergeContent({});

/** Keeps the last database snapshot so pages paint real content instantly. */
let memoryCache: SiteContent | null = null;
const warmedImages = new Set<string>();

/**
 * Download every picture once, right when the site opens, and keep it in
 * memory for the rest of the visit. Later pages then paint instantly and the
 * same file is never fetched twice.
 */
const warmedElements: HTMLImageElement[] = [];

function warmImageCache(content: SiteContent) {
  if (typeof window === "undefined") return;
  const queue = collectImageUrls(content).filter((url) => !warmedImages.has(url));
  if (!queue.length) return;

  const warmBatch = () => {
    queue.splice(0, 24).forEach((url) => {
      warmedImages.add(url);
      const image = new Image();
      image.decoding = "async";
      // Holding a reference keeps the decoded picture alive for the session.
      warmedElements.push(image);
      image.src = url;
    });
    if (queue.length) globalThis.setTimeout(warmBatch, 0);
  };

  warmBatch();
}

/** Only safe after hydration — reading storage during render breaks SSR matching. */
function readStoredCache(): SiteContent | null {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    memoryCache = mergeContent(JSON.parse(raw));
    return memoryCache;
  } catch {
    return null;
  }
}

function writeCache(raw: unknown, merged: SiteContent) {
  memoryCache = merged;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(raw ?? {}));
  } catch {
    /* storage may be full or blocked */
  }
}

/**
 * The realtime connection needs a websocket handshake before the first value
 * arrives. A plain HTTPS read of the same record answers much sooner, so we
 * fire it the moment the app script loads and paint with whatever lands first.
 */
const REST_URL = "https://mageye-hassan-8a3ee-default-rtdb.firebaseio.com/site.json";
let firstLoad: Promise<SiteContent | null> | null = null;

function fetchSiteContentFast(): Promise<SiteContent | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!firstLoad) {
    firstLoad = fetch(REST_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (!raw) return null;
        const merged = mergeContent(raw);
        writeCache(raw, merged);
        warmImageCache(merged);
        return merged;
      })
      .catch(() => null);
  }
  return firstLoad;
}

// Start the read before any component mounts.
void fetchSiteContentFast();

export function useSiteContent() {
  // First client render must match the server render, so start from defaults
  // (or the in-memory snapshot kept from an earlier page in this session).
  const [content, setContent] = useState<SiteContent>(memoryCache ?? EMPTY_LIVE_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    let unsub = () => {};
    const stored = readStoredCache();
    if (stored) setContent(stored);
    warmImageCache(stored ?? EMPTY_LIVE_CONTENT);
    let live = false;
    // Whichever read answers first paints; the realtime one always wins later.
    void fetchSiteContentFast().then((fast) => {
      if (!active || live || !fast) return;
      setContent(fast);
      setLoaded(true);
      setLoadError(false);
    });
    try {
      unsub = onValue(
        ref(firebaseDb(), SITE_PATH),
        (snap) => {
          if (!active) return;
          live = true;
          const raw = snap.val();
          const merged = mergeContent(raw);
          writeCache(raw, merged);
          setContent(merged);
          setLoaded(true);
          setLoadError(false);
          warmImageCache(merged);
        },
        () => {
          if (!active) return;
          setLoadError(true);
        },
      );
    } catch {
      /* Keep the cached content visible when the live read is unavailable. */
      setLoadError(true);
    }
    return () => {
      active = false;
      unsub();
    };
  }, []);

  return { content, loaded, ready: loaded, loadError };
}

export async function saveSection<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
  await set(ref(firebaseDb(), `${SITE_PATH}/${String(key)}`), value);
}

export async function saveAll(content: SiteContent) {
  await set(ref(firebaseDb(), SITE_PATH), content);
}

/** Media (images, videos, trailers) go straight to Cloudflare R2. */
export async function uploadImage(
  file: File,
  folder = "uploads",
  onProgress?: (p: UploadProgress) => void,
) {
  return uploadToR2(`media/${folder}`, file, onProgress);
}
