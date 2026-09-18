/** Browser -> Cloudflare R2 direct uploads via a presigning backend. */

export const UPLOAD_API = "https://function-bun-production-9a7c.up.railway.app";
export const UPLOAD_TOKEN = "*";
export const UPLOAD_BACKEND_STORAGE_KEY = "mageye-upload-backend-url";

export type UploadProgress = { loaded: number; total: number; percent: number };

const PART_SIZE = 8 * 1024 * 1024;
const CONCURRENCY = 8;
const SINGLE_LIMIT = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 60;

function base() {
  if (typeof window === "undefined") return UPLOAD_API;
  const saved = window.localStorage.getItem(UPLOAD_BACKEND_STORAGE_KEY)?.trim();
  return (saved && /^https:\/\/[^/]+\.up\.railway\.app$/i.test(saved) ? saved : UPLOAD_API).replace(/\/+$/, "");
}

async function rawSigner<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UPLOAD_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { message: text };
  }
  if (!res.ok) {
    const p = payload as { message?: string; error?: string };
    throw new Error(p.message ?? p.error ?? `Upload service error (${res.status})`);
  }
  return payload as T;
}

function put(url: string, body: Blob, onLoaded?: (loaded: number) => void) {
  return new Promise<string | null>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onLoaded?.(e.loaded);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.getResponseHeader("ETag")?.replace(/"/g, "") ?? null)
        : reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

async function waitForNetwork() {
  if (typeof navigator === "undefined" || navigator.onLine) return;
  await new Promise<void>((resolve) => {
    const deadline = Date.now() + 30 * 60 * 1000;
    const finish = () => {
      window.removeEventListener("online", finish);
      clearInterval(poll);
      resolve();
    };
    const poll = setInterval(() => {
      if (navigator.onLine || Date.now() > deadline) finish();
    }, 1000);
    window.addEventListener("online", finish);
  });
}

const fatal = (err: unknown) =>
  /unauthor|forbidden|invalid|not configured|must be signed in/i.test(
    err instanceof Error ? err.message : "",
  );

async function withRetry<T>(run: () => Promise<T>, onReset?: () => void): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      onReset?.();
      if (fatal(err) || attempt >= MAX_ATTEMPTS) throw err;
      await waitForNetwork();
      await new Promise((r) => setTimeout(r, Math.min(10000, 1000 * attempt)));
    }
  }
}

const signer = <T,>(path: string, body: unknown) => withRetry(() => rawSigner<T>(path, body));

/** Keeps long uploads alive when the screen dims or the tab is switched. */
async function keepAwake(): Promise<() => void> {
  if (typeof window === "undefined") return () => {};
  const guard = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", guard);
  let lock: any = null;
  try {
    lock = await (navigator as any).wakeLock?.request("screen");
  } catch {
    lock = null;
  }
  return () => {
    window.removeEventListener("beforeunload", guard);
    try {
      lock?.release?.();
    } catch {
      /* ignore */
    }
  };
}

export async function uploadToR2(
  folder: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  const release = await keepAwake();
  const emit = (loaded: number) =>
    onProgress?.({
      loaded,
      total: file.size,
      percent: Math.round((loaded / Math.max(1, file.size)) * 100),
    });

  try {
    if (file.size <= SINGLE_LIMIT) {
      const { url, publicUrl } = await signer<{ url: string; publicUrl: string }>(
        "/uploads/single",
        { folder, filename: file.name, contentType: file.type || "application/octet-stream" },
      );
      await withRetry(
        () => put(url, file, emit),
        () => emit(0),
      );
      emit(file.size);
      return publicUrl;
    }

    const { key, uploadId, publicUrl } = await signer<{
      key: string;
      uploadId: string;
      publicUrl: string;
    }>("/uploads/create", {
      folder,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    });

    const totalParts = Math.ceil(file.size / PART_SIZE);
    const loadedPerPart = new Array<number>(totalParts).fill(0);
    const etags = new Array<string>(totalParts);
    const report = () => emit(loadedPerPart.reduce((a, b) => a + b, 0));

    let next = 0;
    const worker = async () => {
      for (;;) {
        const index = next++;
        if (index >= totalParts) return;
        const partNumber = index + 1;
        const blob = file.slice(index * PART_SIZE, Math.min((index + 1) * PART_SIZE, file.size));

        await withRetry(
          async () => {
            const { urls } = await signer<{ urls: { partNumber: number; url: string }[] }>(
              "/uploads/sign",
              { key, uploadId, partNumbers: [partNumber] },
            );
            const target = urls.find((u) => u.partNumber === partNumber)?.url;
            if (!target) throw new Error("Signer returned no URL for this part");
            const etag = await put(target, blob, (loaded) => {
              loadedPerPart[index] = loaded;
              report();
            });
            if (!etag) throw new Error("Missing ETag — check R2 CORS ExposeHeaders");
            etags[index] = etag;
            loadedPerPart[index] = blob.size;
            report();
          },
          () => {
            loadedPerPart[index] = 0;
            report();
          },
        );
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, totalParts) }, worker));
      await signer("/uploads/complete", {
        key,
        uploadId,
        parts: etags.map((etag, i) => ({ partNumber: i + 1, etag })),
      });
      emit(file.size);
      return publicUrl;
    } catch (err) {
      void signer("/uploads/abort", { key, uploadId }).catch(() => {});
      throw err;
    }
  } finally {
    release();
  }
}
