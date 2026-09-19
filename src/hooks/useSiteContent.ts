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
 * Quietly fill the browser cache after the visible page has started loading.
 * Small batches keep gallery images from competing with the first screen.
 */
function warmImageCache(content: SiteContent) {
  if (typeof window === "undefined") return;
  const queue = collectImageUrls(content).filter((url) => !warmedImages.has(url));
  if (!queue.length) return;

  const warmBatch = () => {
    queue.splice(0, 8).forEach((url) => {
      warmedImages.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    });
    if (queue.length) globalThis.setTimeout(warmBatch, 40);
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
    try {
      unsub = onValue(
        ref(firebaseDb(), SITE_PATH),
        (snap) => {
          if (!active) return;
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
