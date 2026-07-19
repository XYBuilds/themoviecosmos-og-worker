export const META_G_KEY = "meta:G";

export type MovieKvRecord = {
  title: string;
  release_date: string;
  genres: string[];
  poster_url: string;
};

export async function getMetaG(kv: KVNamespace): Promise<string | null> {
  const raw = await kv.get(META_G_KEY);
  if (!raw?.trim()) return null;
  return raw.trim();
}

export async function getMovie(
  kv: KVNamespace,
  movieId: number,
): Promise<MovieKvRecord | null> {
  const raw = await kv.get(`movie:${movieId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MovieKvRecord;
    if (typeof parsed.title === "string") {
      return {
        title: parsed.title,
        release_date: String(parsed.release_date ?? ""),
        genres: Array.isArray(parsed.genres)
          ? parsed.genres.map(String)
          : [],
        poster_url: String(parsed.poster_url ?? ""),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
