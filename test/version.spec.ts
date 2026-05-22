import { describe, expect, it } from "vitest";

import { LAYOUT_VERSION } from "../src/constants";
import {
  brandVersionQuery,
  computeMovieM,
  computeTodayM,
  formatVersionQuery,
  hash8,
  parseVersionQuery,
} from "../src/version";

describe("hash8", () => {
  it("is stable for fixed payload", async () => {
    const a = await hash8(["og-v1", 301334, "Dune", "2021-10-01", "Science Fiction", "https://image.tmdb.org/t/p/w780/x.jpg", 0]);
    const b = await hash8(["og-v1", 301334, "Dune", "2021-10-01", "Science Fiction", "https://image.tmdb.org/t/p/w780/x.jpg", 0]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{8}$/);
  });

  it("changes when placeholderFlag flips", async () => {
    const base = ["og-v1", 1, "T", "2000-01-01", "Drama", "https://image.tmdb.org/t/p/w780/a.jpg"] as const;
    const withPoster = await hash8([...base, 0]);
    const placeholder = await hash8([...base, 1]);
    expect(withPoster).not.toBe(placeholder);
  });
});

describe("computeMovieM / computeTodayM", () => {
  const movie = {
    id: 550,
    title: "Fight Club",
    release_date: "1999-10-15",
    genres: ["Drama"],
    poster_url: "https://image.tmdb.org/t/p/w780/poster.jpg",
  };

  it("computeMovieM matches hash8 SSOT", async () => {
    const m = await computeMovieM(movie, 0);
    const direct = await hash8([
      LAYOUT_VERSION,
      movie.id,
      movie.title,
      movie.release_date,
      movie.genres[0] ?? "",
      movie.poster_url,
      0,
    ]);
    expect(m).toBe(direct);
    expect(m).toBe("90cacf9f"); // golden — bump when LAYOUT_VERSION / fields change
  });

  it("today M includes date", async () => {
    const m0 = await computeTodayM(movie, 0, "2026-05-08");
    const m1 = await computeTodayM(movie, 0, "2026-05-09");
    expect(m0).not.toBe(m1);
  });
});

describe("version query helpers", () => {
  it("formatVersionQuery", () => {
    expect(formatVersionQuery("2026.05.10.daily.30", "abcd1234")).toBe(
      "2026.05.10.daily.30-abcd1234",
    );
  });

  it("brandVersionQuery uses layout version", () => {
    expect(brandVersionQuery()).toBe(`og-brand-${LAYOUT_VERSION}`);
  });

  it("parseVersionQuery", () => {
    expect(parseVersionQuery("2026.05.10.daily.30-abcd1234")).toEqual({
      g: "2026.05.10.daily.30",
      m: "abcd1234",
    });
    expect(parseVersionQuery("invalid")).toBeNull();
  });
});
