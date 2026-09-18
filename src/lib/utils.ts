import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function hide(img: HTMLImageElement) {
  img.dataset["failed"] = "true";
  const figure = img.closest("figure");
  if (figure) figure.style.display = "none";
  else img.style.visibility = "hidden";
}

/**
 * When a picture fails to load, first try converting it in the browser (older
 * iPhone uploads are HEIC, which most browsers cannot decode). Only hide it if
 * that fails, so the page never shows a grey placeholder box.
 */
export function hideBrokenImage(event: { currentTarget: HTMLImageElement }) {
  const img = event.currentTarget;
  const src = img.currentSrc || img.src;

  if (img.dataset["converted"] || !src || src.startsWith("blob:")) {
    hide(img);
    return;
  }
  img.dataset["converted"] = "true";

  void (async () => {
    try {
      const response = await fetch(src, { mode: "cors" });
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.92 });
      const jpeg = Array.isArray(out) ? out[0]! : (out as Blob);
      img.src = URL.createObjectURL(jpeg);
      img.style.visibility = "";
      const figure = img.closest("figure");
      if (figure) figure.style.display = "";
      delete img.dataset["failed"];
    } catch {
      hide(img);
    }
  })();
}

