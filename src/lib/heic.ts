/**
 * iPhone photos (.heic / .heif / .hif) are not displayable in most browsers,
 * so convert them to JPEG in the browser before uploading.
 */
export function isHeic(file: File) {
  return (
    /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif|hif)$/i.test(file.name)
  );
}

export async function normalizeImage(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(out) ? out[0]! : (out as Blob);
    const name = file.name.replace(/\.(heic|heif|hif)$/i, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    // Safari can upload HEIC as-is; fall back to the original file.
    return file;
  }
}
