import { LAYOUT_VERSION } from "./constants";

/** Delimiter for hash8 payload (must match golden tests / main-repo SSOT). */
const HASH_SEP = "\x1e";

export type OgMovieFields = {
  id: number;
  title: string;
  release_date: string;
  genres: string[];
  poster_url: string;
};

/** First 8 hex chars of SHA-256 over joined parts. */
export async function hash8(parts: (string | number | boolean)[]): Promise<string> {
  const payload = parts.map((p) => String(p)).join(HASH_SEP);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 8);
}

/** Content fingerprint `M` for `/og/movie/{id}.png`. */
export async function computeMovieM(
  movie: OgMovieFields,
  placeholderFlag: 0 | 1,
): Promise<string> {
  return hash8([
    LAYOUT_VERSION,
    movie.id,
    movie.title,
    movie.release_date,
    movie.genres[0] ?? "",
    movie.poster_url,
    placeholderFlag,
  ]);
}

/** Content fingerprint `M` for `/og/today.png` (includes UTC pick date). */
export async function computeTodayM(
  movie: OgMovieFields,
  placeholderFlag: 0 | 1,
  todayDate: string,
): Promise<string> {
  return hash8([
    LAYOUT_VERSION,
    movie.id,
    movie.title,
    movie.release_date,
    movie.genres[0] ?? "",
    movie.poster_url,
    placeholderFlag,
    todayDate,
  ]);
}

export function formatVersionQuery(g: string, m: string): string {
  return `${g}-${m}`;
}

export function brandVersionQuery(): string {
  return `og-brand-${LAYOUT_VERSION}`;
}

export function parseVersionQuery(v: string | null): { g: string; m: string } | null {
  if (!v) return null;
  const idx = v.indexOf("-");
  if (idx <= 0 || idx >= v.length - 1) return null;
  return { g: v.slice(0, idx), m: v.slice(idx + 1) };
}
