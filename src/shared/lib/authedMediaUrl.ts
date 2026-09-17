import { httpClient } from "@lib/axios/httpClient";
import { env } from "@shared/config/env";

/**
 * A URL a browser can put in `<img src>` / `<video src>`, given a media URL that
 * needs a bearer token.
 *
 * `GET /api/media/{id}/content` is authenticated and reads the caller from the
 * Authorization header, but a subresource load never sends one — so a saved cover
 * image or trailer rendered straight from {@link mediaContentUrl} is always a 401
 * and always a blank box. Fetching the bytes through the authenticated client and
 * handing back an object URL is what {@link MediaImage} already does; this is the
 * same trick for callers that need a plain URL rather than a component.
 *
 * Anything that is not an API media URL (a blob:, data: or genuinely public URL)
 * is returned unchanged, so this is safe to apply to any string.
 *
 * The caller owns the returned URL: revoke it with `URL.revokeObjectURL` when the
 * value changes or the component unmounts, or the blob leaks for the life of the
 * document. `revoke` is true only when there is something to revoke.
 */
export async function resolveAuthedMediaUrl(
  url: string,
): Promise<{ url: string; revoke: boolean }> {
  if (!needsAuth(url)) return { url, revoke: false };

  const path = url.startsWith(env.api.baseUrl) ? url.slice(env.api.baseUrl.length) : url;
  const res = await httpClient.get(path, { responseType: "blob" });
  return { url: URL.createObjectURL(res.data as Blob), revoke: true };
}

/**
 * True for URLs served by this API's authenticated media endpoint.
 *
 * `/api/public/media/...` is deliberately excluded: it is anonymous by design, so
 * routing it through the authenticated client would add a pointless round trip
 * through a blob and lose ordinary HTTP caching.
 */
function needsAuth(url: string): boolean {
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;
  if (url.includes("/public/media/")) return false;
  return url.startsWith(`${env.api.baseUrl}/media/`) || url.startsWith("/api/media/");
}
