/** Layout SSOT — bump when OG card design changes (invalidates cached PNG URLs). */
export const LAYOUT_VERSION = "og-v1";

export const CANVAS_W = 1200;
export const CANVAS_H = 630;

export const POSTER_W = 380;
export const POSTER_H = 570;
export const POSTER_X = 60;
export const POSTER_Y = (CANVAS_H - POSTER_H) / 2;
export const POSTER_RADIUS = 14;

export const RIGHT_X = POSTER_X + POSTER_W + 56;
export const RIGHT_W = CANVAS_W - RIGHT_X - 60;

export const COSMOS_BLACK = "#0a0a0c";
export const TEXT_PRIMARY = "#f2f2f2";
export const TEXT_SECONDARY = "#aaaab0";
export const DEFAULT_ACCENT = "#5ab5ff";

/** Frozen genre palette v1 (matches main-repo `genre_palette.py`). */
export const GENRE_PALETTE_HEX: Record<string, string> = {
  Action: "#F486AA",
  Adventure: "#FA878B",
  Animation: "#F88C6B",
  Comedy: "#F0954C",
  Crime: "#E0A034",
  Documentary: "#CAAC2F",
  Drama: "#AEB742",
  Family: "#8BC05F",
  Fantasy: "#61C780",
  History: "#27CAA1",
  Horror: "#00C9C1",
  Music: "#00C5DC",
  Mystery: "#1FBEF2",
  Romance: "#5AB5FF",
  "Science Fiction": "#83ABFF",
  "TV Movie": "#A4A0FF",
  Thriller: "#C097F6",
  War: "#D78FE2",
  Western: "#E989C8",
};

export const DEFAULT_BRAND = "the movie cosmos";
export const DEFAULT_FOOTER_URL = "themoviecosmos.com";
/** TMDB API Terms — optional OG card footer (English; social crawlers). */
export const TMDB_OG_ATTRIBUTION = "Data from TMDB";

export const POSTER_FETCH_TIMEOUT_MS = 10_000;
export const POSTER_USER_AGENT =
  "the-movie-cosmos/og-worker (+https://themoviecosmos.com)";

export const PNG_CACHE_HEADERS: Record<string, string> = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
};
