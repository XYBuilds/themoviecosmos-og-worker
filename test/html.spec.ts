import { describe, expect, it } from "vitest";

import {
  buildCanonicalPageUrl,
  buildOgImageUrl,
  escapeHtmlAttr,
  formatMovieOgTitle,
  formatTodayOgTitle,
  injectHtmlMeta,
  isTodayPagePath,
  parseMoviePageId,
  releaseYear,
  wantsHtmlResponse,
} from "../src/html";

const MINIMAL_SHELL = `<!doctype html>
<html>
<head>
  <title>the movie cosmos</title>
  <meta property="og:title" content="The Movie Cosmos" />
  <meta property="og:description" content="old desc" />
  <meta property="og:url" content="https://themoviecosmos.com/" />
  <meta property="og:image" content="https://themoviecosmos.com/data/og-today.png" />
  <meta property="og:image:alt" content="alt" />
  <meta name="twitter:title" content="The Movie Cosmos" />
  <meta name="twitter:description" content="old tw" />
  <meta name="twitter:image" content="https://themoviecosmos.com/data/og-today.png" />
</head>
<body></body>
</html>`;

describe("path parsing", () => {
  it("parseMoviePageId accepts /movie/550", () => {
    expect(parseMoviePageId("/movie/550")).toBe(550);
    expect(parseMoviePageId("/movie/550/")).toBe(550);
  });

  it("parseMoviePageId rejects invalid paths", () => {
    expect(parseMoviePageId("/movie/abc")).toBeNull();
    expect(parseMoviePageId("/movie/0")).toBeNull();
    expect(parseMoviePageId("/og/movie/1.png")).toBeNull();
  });

  it("isTodayPagePath", () => {
    expect(isTodayPagePath("/today")).toBe(true);
    expect(isTodayPagePath("/today/")).toBe(true);
    expect(isTodayPagePath("/")).toBe(false);
  });
});

describe("wantsHtmlResponse", () => {
  it("defaults to html when Accept missing", () => {
    const req = new Request("https://themoviecosmos.com/movie/1");
    expect(wantsHtmlResponse(req)).toBe(true);
  });

  it("honors text/html Accept", () => {
    const req = new Request("https://themoviecosmos.com/movie/1", {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    expect(wantsHtmlResponse(req)).toBe(true);
  });
});

describe("title formatting", () => {
  it("releaseYear and movie title", () => {
    expect(releaseYear("1999-10-15")).toBe("1999");
    expect(formatMovieOgTitle("Fight Club", "1999-10-15")).toBe(
      "Fight Club (1999) — The Movie Cosmos",
    );
  });

  it("today title includes The Movie Today", () => {
    expect(formatTodayOgTitle("Dune", "2021-10-01")).toBe(
      "The Movie Today — Dune (2021) — The Movie Cosmos",
    );
  });
});

describe("injectHtmlMeta", () => {
  it("replaces og and twitter tags", () => {
    const out = injectHtmlMeta(MINIMAL_SHELL, {
      title: "Fight Club (1999) — The Movie Cosmos",
      description: "short",
      ogUrl: "https://themoviecosmos.com/movie/550",
      ogImage: "https://themoviecosmos.com/og/movie/550.png?v=g-m",
      ogImageAlt: "Fight Club (1999) — The Movie Cosmos",
    });
    expect(out).toContain('property="og:url" content="https://themoviecosmos.com/movie/550"');
    expect(out).toContain('property="og:image" content="https://themoviecosmos.com/og/movie/550.png?v=g-m"');
    expect(out).not.toContain("og-today.png");
    expect(out).toContain("<title>Fight Club (1999) — The Movie Cosmos</title>");
  });

  it("escapes quotes in titles", () => {
    const out = injectHtmlMeta(MINIMAL_SHELL, {
      title: 'Amélie "Special"',
      description: "d",
      ogUrl: "https://themoviecosmos.com/movie/1",
      ogImage: "https://themoviecosmos.com/og/brand.png",
      ogImageAlt: "a",
    });
    expect(out).toContain("&quot;Special&quot;");
    expect(escapeHtmlAttr('<&"')).toBe("&lt;&amp;&quot;");
  });
});

describe("URL builders", () => {
  it("buildCanonicalPageUrl preserves query", () => {
    expect(
      buildCanonicalPageUrl(
        "https://themoviecosmos.com",
        "/movie/550",
        "?lang=zh",
      ),
    ).toBe("https://themoviecosmos.com/movie/550?lang=zh");
  });

  it("buildOgImageUrl sets v param", () => {
    expect(
      buildOgImageUrl("https://themoviecosmos.com", "/og/today.png", "G-M"),
    ).toBe("https://themoviecosmos.com/og/today.png?v=G-M");
  });
});
