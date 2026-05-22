import { brandVersionQuery, computeMovieM, computeTodayM, formatVersionQuery } from "./version";
import type { MovieKvRecord, TodayKvRecord } from "./kv";
import type { OgMovieFields } from "./version";

export const BRAND_OG_TITLE = "The Movie Cosmos";
export const SHORT_OG_DESCRIPTION =
  "A 2.5D galaxy of ~60,000 films from TMDB. Explore release history as depth in The Movie Cosmos.";

export type HtmlMetaPayload = {
  title: string;
  description: string;
  ogUrl: string;
  ogImage: string;
  ogImageAlt: string;
};

/** Whether pathname is a `/movie/:segment` SPA route (any segment). */
export function isMoviePagePath(pathname: string): boolean {
  return /^\/movie\/[^/]+\/?$/i.test(pathname);
}

/** Positive integer movie id from `/movie/:id` (no trailing segment). */
export function parseMoviePageId(pathname: string): number | null {
  const m = pathname.match(/^\/movie\/(\d+)\/?$/i);
  if (!m) return null;
  const id = Number.parseInt(m[1]!, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function isTodayPagePath(pathname: string): boolean {
  return pathname === "/today" || pathname === "/today/";
}

export function wantsHtmlResponse(request: Request): boolean {
  const accept = request.headers.get("Accept") ?? "";
  if (!accept.trim()) return true;
  if (accept.includes("text/html")) return true;
  if (accept.includes("*/*") && !accept.includes("application/json")) return true;
  return false;
}

export function releaseYear(releaseDate: string): string | null {
  const m = /^(\d{4})/.exec(releaseDate.trim());
  return m ? m[1]! : null;
}

export function formatMovieOgTitle(title: string, releaseDate: string): string {
  const year = releaseYear(releaseDate);
  return year ? `${title} (${year}) — ${BRAND_OG_TITLE}` : `${title} — ${BRAND_OG_TITLE}`;
}

export function formatTodayOgTitle(title: string, releaseDate: string): string {
  const year = releaseYear(releaseDate);
  const core = year ? `${title} (${year})` : title;
  return `The Movie Today — ${core} — ${BRAND_OG_TITLE}`;
}

export function buildCanonicalPageUrl(origin: string, pathname: string, search: string): string {
  const path = pathname.endsWith("/") && pathname !== "/"
    ? pathname.replace(/\/+$/, "")
    : pathname;
  const base = `${origin.replace(/\/+$/, "")}${path}`;
  return search ? `${base}${search.startsWith("?") ? search : `?${search}`}` : base;
}

export function buildOgImageUrl(
  origin: string,
  path: string,
  versionQuery: string,
): string {
  const base = `${origin.replace(/\/+$/, "")}${path}`;
  const url = new URL(base);
  url.searchParams.set("v", versionQuery);
  return url.toString();
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function replaceMetaProperty(html: string, property: string, content: string): string {
  const safe = escapeHtmlAttr(content);
  const re = new RegExp(
    `<meta\\s+property="${property}"\\s+content="[^"]*"\\s*/?>`,
    "i",
  );
  const tag = `<meta property="${property}" content="${safe}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function replaceMetaName(html: string, name: string, content: string): string {
  const safe = escapeHtmlAttr(content);
  const re = new RegExp(
    `<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`,
    "i",
  );
  const tag = `<meta name="${name}" content="${safe}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function replaceDocumentTitle(html: string, title: string): string {
  const safe = escapeHtmlAttr(title);
  const re = /<title>[^<]*<\/title>/i;
  const tag = `<title>${safe}</title>`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

/** Inject or replace Open Graph / Twitter meta in SPA `index.html` shell. */
export function injectHtmlMeta(shellHtml: string, meta: HtmlMetaPayload): string {
  let html = shellHtml;
  html = replaceDocumentTitle(html, meta.title);
  html = replaceMetaProperty(html, "og:title", meta.title);
  html = replaceMetaProperty(html, "og:description", meta.description);
  html = replaceMetaProperty(html, "og:url", meta.ogUrl);
  html = replaceMetaProperty(html, "og:image", meta.ogImage);
  html = replaceMetaProperty(html, "og:image:alt", meta.ogImageAlt);
  html = replaceMetaName(html, "description", meta.description);
  html = replaceMetaName(html, "twitter:title", meta.title);
  html = replaceMetaName(html, "twitter:description", meta.description);
  html = replaceMetaName(html, "twitter:image", meta.ogImage);
  return html;
}

export async function resolveMoviePageMeta(
  origin: string,
  movieId: number,
  pageUrl: string,
  g: string | null,
  record: MovieKvRecord | null,
): Promise<HtmlMetaPayload> {
  if (!g || !record) {
    const v = brandVersionQuery();
    return {
      title: BRAND_OG_TITLE,
      description: SHORT_OG_DESCRIPTION,
      ogUrl: pageUrl,
      ogImage: buildOgImageUrl(origin, "/og/brand.png", v),
      ogImageAlt: BRAND_OG_TITLE,
    };
  }

  const movie: OgMovieFields = {
    id: movieId,
    title: record.title,
    release_date: record.release_date,
    genres: record.genres,
    poster_url: record.poster_url,
  };
  const m = await computeMovieM(movie, 0);
  const v = formatVersionQuery(g, m);
  const title = formatMovieOgTitle(record.title, record.release_date);

  return {
    title,
    description: SHORT_OG_DESCRIPTION,
    ogUrl: pageUrl,
    ogImage: buildOgImageUrl(origin, `/og/movie/${movieId}.png`, v),
    ogImageAlt: title,
  };
}

export async function resolveTodayPageMeta(
  origin: string,
  pageUrl: string,
  g: string | null,
  today: TodayKvRecord | null,
  record: MovieKvRecord | null,
): Promise<HtmlMetaPayload> {
  if (!g || !today || !record) {
    const v = brandVersionQuery();
    return {
      title: BRAND_OG_TITLE,
      description: SHORT_OG_DESCRIPTION,
      ogUrl: pageUrl,
      ogImage: buildOgImageUrl(origin, "/og/brand.png", v),
      ogImageAlt: BRAND_OG_TITLE,
    };
  }

  const movie: OgMovieFields = {
    id: today.movie_id,
    title: record.title,
    release_date: record.release_date,
    genres: record.genres,
    poster_url: record.poster_url,
  };
  const m = await computeTodayM(movie, 0, today.date);
  const v = formatVersionQuery(g, m);
  const title = formatTodayOgTitle(record.title, record.release_date);

  return {
    title,
    description: SHORT_OG_DESCRIPTION,
    ogUrl: pageUrl,
    ogImage: buildOgImageUrl(origin, "/og/today.png", v),
    ogImageAlt: title,
  };
}

export async function fetchSpaShell(origin: string): Promise<string> {
  const indexUrl = `${origin.replace(/\/+$/, "")}/index.html`;
  const res = await fetch(indexUrl, {
    method: "GET",
    headers: { Accept: "text/html" },
    cf: { cacheEverything: false },
  });
  if (!res.ok) {
    throw new Error(`SPA shell fetch failed: ${res.status} ${indexUrl}`);
  }
  return res.text();
}

export const HTML_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=0, must-revalidate",
};
