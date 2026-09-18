import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Hides a picture that fails to load (broken upload, HEIC the browser can't
 * decode) so the page never shows a grey placeholder box.
 */
export function hideBrokenImage(event: { currentTarget: HTMLImageElement }) {
  const img = event.currentTarget;
  img.dataset["failed"] = "true";
  const figure = img.closest("figure");
  if (figure) figure.style.display = "none";
  else img.style.visibility = "hidden";
}
