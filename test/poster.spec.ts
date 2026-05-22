import { describe, expect, it } from "vitest";

import { accentForGenre, normalizePosterUrl } from "../src/poster";

describe("normalizePosterUrl", () => {
  it("rewrites w780 to w342 on TMDB host only", () => {
    expect(
      normalizePosterUrl(
        "https://image.tmdb.org/t/p/w780/abc.jpg",
      ),
    ).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  });

  it("rejects non-TMDB hosts", () => {
    expect(normalizePosterUrl("https://example.com/x.jpg")).toBeNull();
    expect(normalizePosterUrl("")).toBeNull();
  });
});

describe("accentForGenre", () => {
  it("uses first genre palette color", () => {
    expect(accentForGenre(["Drama"])).toBe("#AEB742");
  });

  it("falls back when genre unknown", () => {
    expect(accentForGenre([])).toBe("#5ab5ff");
  });
});
