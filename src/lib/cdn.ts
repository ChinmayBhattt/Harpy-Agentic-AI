import cdnMapping from "./cdnImages.json";

/**
 * Maps local image paths (e.g. "/images/harpy-logo-light.png") to high-speed Cloudinary CDN URLs.
 * With automatic format and quality optimization (f_auto, q_auto).
 */
export const CDN_IMAGES: Record<string, string> = cdnMapping as Record<string, string>;

/**
 * Returns the CDN URL for a given local image path.
 * If not found in the CDN mapping, returns the local path as fallback.
 *
 * @example
 * cdn("/images/harpy-logo-light.png")
 * // => "https://res.cloudinary.com/zmgxzsaw/image/upload/f_auto,q_auto/.../harpy/images/harpy-logo-light.png"
 */
export function cdn(localPath: string): string {
  if (!localPath) return localPath;
  return CDN_IMAGES[localPath] || localPath;
}

export default cdn;
