import {
  DEFAULT_ACCENT,
  GENRE_PALETTE_HEX,
  POSTER_FETCH_TIMEOUT_MS,
  POSTER_USER_AGENT,
} from "./constants";

const TMDB_IMAGE_HOST = "image.tmdb.org";

/** Only TMDB CDN; downgrade export w780 (etc.) to w342 for OG fetch. */
export function normalizePosterUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.hostname !== TMDB_IMAGE_HOST) return null;
    if (!u.protocol.startsWith("https")) return null;
    u.pathname = u.pathname.replace(/\/w\d+\//i, "/w342/");
    return u.toString();
  } catch {
    return null;
  }
}

export function accentForGenre(genres: string[]): string {
  const g0 = genres[0]?.trim();
  if (g0 && GENRE_PALETTE_HEX[g0]) return GENRE_PALETTE_HEX[g0];
  return DEFAULT_ACCENT;
}

export type PosterFetchResult = {
  /** base64 data URL for satori <img src=...> */
  dataUrl: string | null;
  placeholderFlag: 0 | 1;
};

export async function downloadPoster(
  posterUrl: string,
): Promise<PosterFetchResult> {
  const normalized = normalizePosterUrl(posterUrl);
  if (!normalized) {
    console.log("[og-worker] poster skip: empty or non-TMDB url");
    return { dataUrl: null, placeholderFlag: 1 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POSTER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { "User-Agent": POSTER_USER_AGENT },
    });
    if (!res.ok) {
      console.log(
        `[og-worker] poster fetch failed status=${res.status} url=${normalized}`,
      );
      return { dataUrl: null, placeholderFlag: 1 };
    }
    const ctype = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = await res.arrayBuffer();
    console.log(
      `[og-worker] poster ok bytes=${bytes.byteLength} type=${ctype}`,
    );
    const b64 = bytesToBase64(bytes);
    const mime = ctype.split(";")[0]?.trim() || "image/jpeg";
    return { dataUrl: `data:${mime};base64,${b64}`, placeholderFlag: 0 };
  } catch (err) {
    console.log(`[og-worker] poster error url=${normalized} err=${String(err)}`);
    return { dataUrl: null, placeholderFlag: 1 };
  } finally {
    clearTimeout(timer);
  }
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}
