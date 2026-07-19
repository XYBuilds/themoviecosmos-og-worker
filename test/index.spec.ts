import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/render/brand", () => ({
  renderBrandCardPng: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));
vi.mock("../src/render/card", () => ({
  renderMovieCardPng: vi.fn(async () => new Uint8Array([4, 5, 6])),
}));
vi.mock("../src/render/fonts", () => ({
  loadOgFonts: vi.fn(async () => ({ butler: new ArrayBuffer(0), inter: new ArrayBuffer(0) })),
}));
vi.mock("../src/poster", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/poster")>();
  return {
    ...actual,
    downloadPoster: vi.fn(async () => ({
      dataUrl: "data:image/png;base64,AA==",
      placeholderFlag: 0 as const,
    })),
  };
});

import worker, { type Env } from "../src/index";
import { renderBrandCardPng } from "../src/render/brand";
import { renderMovieCardPng } from "../src/render/card";
import { computeMovieM, formatVersionQuery } from "../src/version";

const MOVIE = {
  title: "Fight Club",
  release_date: "1999-10-15",
  genres: ["Drama"],
  poster_url: "https://image.tmdb.org/t/p/w780/poster.jpg",
};

function makeEnv(kvGet: ReturnType<typeof vi.fn>): Env {
  return {
    OG_INDEX: { get: kvGet } as unknown as KVNamespace,
    ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
    SITE_ORIGIN: "https://themoviecosmos.com",
  };
}

async function fetchWorker(
  path: string,
  options: RequestInit,
  env: Env,
): Promise<Response> {
  return worker.fetch(
    new Request(`https://themoviecosmos.com${path}`, options),
    env,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("retired Today URLs", () => {
  type RetiredRouteCase = {
    path: string;
    method: "GET" | "HEAD";
    accept?: "text/html" | "image/png" | "*/*";
  };

  const todayCases: RetiredRouteCase[] = [
    { path: "/today", method: "GET", accept: "text/html" },
    { path: "/today", method: "HEAD", accept: "image/png" },
    { path: "/today?lang=zh", method: "GET", accept: "*/*" },
    { path: "/today?lang=zh", method: "HEAD" },
  ];
  const todayImageCases: RetiredRouteCase[] = [
    { path: "/og/today.png", method: "GET", accept: "image/png" },
    { path: "/og/today.png", method: "HEAD", accept: "*/*" },
    { path: "/og/today.png?cache=bust", method: "GET", accept: "text/html" },
    { path: "/og/today.png?cache=bust", method: "HEAD" },
  ];

  for (const { path, method, accept } of [...todayCases, ...todayImageCases]) {
    it(`${method} ${path} returns a side-effect-free 404`, async () => {
      const kvGet = vi.fn();
      const originFetch = vi.fn();
      vi.stubGlobal("fetch", originFetch);

      const response = await fetchWorker(
        path,
        { method, headers: accept ? { Accept: accept } : undefined },
        makeEnv(kvGet),
      );

      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
      const contentType = response.headers.get("Content-Type") ?? "";
      expect(contentType).not.toContain("image/png");
      expect(contentType).not.toContain("text/html");
      expect(kvGet).not.toHaveBeenCalled();
      expect(originFetch).not.toHaveBeenCalled();
      expect(renderBrandCardPng).not.toHaveBeenCalled();
      expect(renderMovieCardPng).not.toHaveBeenCalled();
      if (method === "GET") {
        await expect(response.text()).resolves.toBe("Not Found");
      } else {
        expect(response.body).toBeNull();
      }
    });
  }

  const shareCases: Array<Pick<RetiredRouteCase, "path" | "method">> = [
    { path: "/share/today", method: "GET" },
    { path: "/share/today", method: "HEAD" },
    { path: "/share/today?lang=zh", method: "GET" },
    { path: "/share/today?lang=zh", method: "HEAD" },
  ];

  for (const { path, method } of shareCases) {
    it(`${method} ${path} does not fall back to an active route`, async () => {
      const kvGet = vi.fn();
      const originFetch = vi.fn();
      vi.stubGlobal("fetch", originFetch);

      const response = await fetchWorker(path, { method }, makeEnv(kvGet));

      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
      expect(kvGet).not.toHaveBeenCalled();
      expect(originFetch).not.toHaveBeenCalled();
      expect(renderBrandCardPng).not.toHaveBeenCalled();
      expect(renderMovieCardPng).not.toHaveBeenCalled();
      if (method === "GET") {
        await expect(response.text()).resolves.toBe("Not Found");
      } else {
        expect(response.body).toBeNull();
      }
    });
  }
});

describe("active brand and movie routes", () => {
  it("preserves brand canonical redirect and PNG response", async () => {
    const kvGet = vi.fn();
    const env = makeEnv(kvGet);

    const redirect = await fetchWorker("/og/brand.png", { method: "GET" }, env);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("Location")).toBe(
      "https://themoviecosmos.com/og/brand.png?v=og-brand-og-v1",
    );

    const image = await fetchWorker(
      "/og/brand.png?v=og-brand-og-v1",
      { method: "HEAD" },
      env,
    );
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");
    expect(image.body).toBeNull();
    expect(kvGet).not.toHaveBeenCalled();
  });

  it("preserves movie PNG canonical version and GET response", async () => {
    const kvGet = vi.fn(async (key: string) => {
      if (key === "meta:G") return "2026.05.10.daily.30";
      if (key === "movie:550") return JSON.stringify(MOVIE);
      return null;
    });
    const env = makeEnv(kvGet);
    const m = await computeMovieM({ id: 550, ...MOVIE }, 0);
    const version = formatVersionQuery("2026.05.10.daily.30", m);

    const redirect = await fetchWorker("/og/movie/550.png", { method: "GET" }, env);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("Location")).toBe(
      `https://themoviecosmos.com/og/movie/550.png?v=${version}`,
    );

    const image = await fetchWorker(
      `/og/movie/550.png?v=${version}`,
      { method: "GET" },
      env,
    );
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");
    await expect(image.arrayBuffer()).resolves.toBeInstanceOf(ArrayBuffer);
    expect(kvGet).toHaveBeenCalledWith("meta:G");
    expect(kvGet).toHaveBeenCalledWith("movie:550");

    const head = await fetchWorker(
      `/og/movie/550.png?v=${version}`,
      { method: "HEAD" },
      env,
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("Content-Type")).toBe("image/png");
    expect(head.body).toBeNull();
  });

  it("falls back to the brand image when a movie record is missing", async () => {
    const kvGet = vi.fn(async (key: string) =>
      key === "meta:G" ? "2026.05.10.daily.30" : null,
    );

    const response = await fetchWorker(
      "/og/movie/404.png?v=anything",
      { method: "HEAD" },
      makeEnv(kvGet),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.body).toBeNull();
    expect(kvGet).toHaveBeenCalledWith("movie:404");
  });

  it("injects movie meta and uses a brand fallback for an invalid movie page", async () => {
    const shell = "<html><head><title>the movie cosmos</title></head><body></body></html>";
    const originFetch = vi.fn(async () => new Response(shell));
    vi.stubGlobal("fetch", originFetch);
    const kvGet = vi.fn(async (key: string) => {
      if (key === "meta:G") return "2026.05.10.daily.30";
      if (key === "movie:550") return JSON.stringify(MOVIE);
      return null;
    });
    const env = makeEnv(kvGet);

    const movieResponse = await fetchWorker(
      "/movie/550?lang=zh",
      { method: "GET", headers: { Accept: "text/html" } },
      env,
    );
    expect(movieResponse.status).toBe(200);
    await expect(movieResponse.text()).resolves.toContain(
      "https://themoviecosmos.com/og/movie/550.png?v=2026.05.10.daily.30-90cacf9f",
    );

    const invalidResponse = await fetchWorker(
      "/movie/not-a-number",
      { method: "HEAD", headers: { Accept: "text/html" } },
      env,
    );
    expect(invalidResponse.status).toBe(200);
    expect(invalidResponse.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(invalidResponse.body).toBeNull();
    expect(kvGet).toHaveBeenCalledWith("meta:G");
    expect(kvGet).not.toHaveBeenCalledWith("movie:0");
    expect(originFetch).toHaveBeenCalledTimes(2);
  });
});