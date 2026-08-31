/**
 * Upload constraints for course images.
 *
 * Server actions on Vercel accept roughly 4.5 MB of request body, so the cap
 * sits below that with room for the rest of the form.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_COURSE = 8;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** For the file picker's accept attribute. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

export type ImageCheck =
  | { ok: true; type: AllowedImageType; extension: string }
  | { ok: false; reason: 'empty' | 'too-large' | 'bad-type' };

/**
 * Identify a file by its leading bytes rather than trusting `file.type`.
 *
 * The declared MIME type comes from the browser and is trivially forged, so a
 * script could post an HTML or SVG payload labelled image/png. Blob storage
 * serves what it is given from a domain adjacent to the site, which makes that
 * worth blocking rather than assuming.
 */
function sniff(bytes: Uint8Array): { type: AllowedImageType; extension: string } | null {
  // JPEG: FF D8 FF
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: 'image/jpeg', extension: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length > 8 && png.every((byte, i) => bytes[i] === byte)) {
    return { type: 'image/png', extension: 'png' };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { type: 'image/webp', extension: 'webp' };
  }

  return null;
}

export async function inspectImage(file: File): Promise<ImageCheck> {
  if (!file || file.size === 0) return { ok: false, reason: 'empty' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'too-large' };

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniff(header);
  if (!sniffed) return { ok: false, reason: 'bad-type' };

  return { ok: true, ...sniffed };
}

/** Blob storage is configured only when the token is present. */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
