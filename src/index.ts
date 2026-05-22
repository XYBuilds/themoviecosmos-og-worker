import { PNG_CACHE_HEADERS } from "./constants";
import { getMetaG, getMovie, getToday } from "./kv";
import { accentForGenre, downloadPoster } from "./poster";
import { renderBrandCardPng } from "./render/brand";
import { renderMovieCardPng } from "./render/card";
import { loadOgFonts } from "./render/fonts";
import {
  brandVersionQuery,
  computeMovieM,
  computeTodayM,
  formatVersionQuery,
  type OgMovieFields,
} from "./version";

export interface Env {
  OG_INDEX: KVNamespace;
  ASSETS: Fetcher;
  SITE_ORIGIN: string;
}

function pngResponse(bytes: Uint8Array): Response {
  return new Response(bytes as unknown as BodyInit, { headers: PNG_CACHE_HEADERS });
}

function redirectCanonical(url: URL): Response {
  return Response.redirect(url.toString(), 302);
}

function parseMovieId(pathname: string): number | null {
  const m = pathname.match(/^\/og\/movie\/(\d+)\.png$/i);
  if (!m) return null;
  const id = Number.parseInt(m[1]!, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function renderFromMovieFields(
  env: Env,
  movie: OgMovieFields,
  opts: { todayDate?: string; posterDataUrl: string | null },
): Promise<Uint8Array> {
  const accent = accentForGenre(movie.genres);
  const fonts = await loadOgFonts(env.ASSETS);
  return renderMovieCardPng(
    {
      title: movie.title,
      releaseDate: movie.release_date,
      genres: movie.genres,
      posterDataUrl: opts.posterDataUrl,
      accentHex: accent,
      todayDate: opts.todayDate,
    },
    fonts,
  );
}

async function handleMovieOg(
  env: Env,
  request: Request,
  movieId: number,
): Promise<Response> {
  const url = new URL(request.url);
  const g = await getMetaG(env.OG_INDEX);
  if (!g) {
    console.log("[og-worker] meta:G missing → brand");
    return handleBrandOg(env, request, true);
  }

  const record = await getMovie(env.OG_INDEX, movieId);
  if (!record) {
    console.log(`[og-worker] movie:${movieId} KV miss → brand`);
    return handleBrandOg(env, request, true);
  }

  const movie: OgMovieFields = {
    id: movieId,
    title: record.title,
    release_date: record.release_date,
    genres: record.genres,
    poster_url: record.poster_url,
  };

  const { dataUrl, placeholderFlag } = await downloadPoster(movie.poster_url);
  const m = await computeMovieM(movie, placeholderFlag);
  const canonicalV = formatVersionQuery(g, m);
  const reqV = url.searchParams.get("v");

  if (reqV !== canonicalV) {
    url.searchParams.set("v", canonicalV);
    return redirectCanonical(url);
  }

  const png = await renderFromMovieFields(env, movie, { posterDataUrl: dataUrl });
  return pngResponse(png);
}

async function handleTodayOg(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const g = await getMetaG(env.OG_INDEX);
  const today = await getToday(env.OG_INDEX);
  if (!g || !today) {
    console.log("[og-worker] today or meta:G missing → brand");
    return handleBrandOg(env, request, true);
  }

  const record = await getMovie(env.OG_INDEX, today.movie_id);
  if (!record) {
    console.log(`[og-worker] today movie:${today.movie_id} miss → brand`);
    return handleBrandOg(env, request, true);
  }

  const movie: OgMovieFields = {
    id: today.movie_id,
    title: record.title,
    release_date: record.release_date,
    genres: record.genres,
    poster_url: record.poster_url,
  };

  const { dataUrl, placeholderFlag } = await downloadPoster(movie.poster_url);
  const m = await computeTodayM(movie, placeholderFlag, today.date);
  const canonicalV = formatVersionQuery(g, m);
  const reqV = url.searchParams.get("v");

  if (reqV !== canonicalV) {
    url.searchParams.set("v", canonicalV);
    return redirectCanonical(url);
  }

  const png = await renderFromMovieFields(env, movie, {
    todayDate: today.date,
    posterDataUrl: dataUrl,
  });
  return pngResponse(png);
}

async function handleBrandOg(
  env: Env,
  request: Request,
  skipVersionCheck = false,
): Promise<Response> {
  const url = new URL(request.url);
  const canonicalV = brandVersionQuery();
  const reqV = url.searchParams.get("v");

  if (!skipVersionCheck && reqV !== canonicalV) {
    url.searchParams.set("v", canonicalV);
    return redirectCanonical(url);
  }

  const fonts = await loadOgFonts(env.ASSETS);
  const png = await renderBrandCardPng(fonts);
  return pngResponse(png);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      if (pathname === "/og/brand.png") {
        const res = await handleBrandOg(env, request);
        return request.method === "HEAD"
          ? new Response(null, { status: res.status, headers: res.headers })
          : res;
      }

      if (pathname === "/og/today.png") {
        const res = await handleTodayOg(env, request);
        return request.method === "HEAD"
          ? new Response(null, { status: res.status, headers: res.headers })
          : res;
      }

      const movieId = parseMovieId(pathname);
      if (movieId !== null) {
        const res = await handleMovieOg(env, request, movieId);
        return request.method === "HEAD"
          ? new Response(null, { status: res.status, headers: res.headers })
          : res;
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error(`[og-worker] unhandled error path=${pathname}`, err);
      return new Response("Internal Error", { status: 500 });
    }
  },
};
