import {
  CANVAS_H,
  CANVAS_W,
  COSMOS_BLACK,
  DEFAULT_BRAND,
  DEFAULT_FOOTER_URL,
  TMDB_OG_ATTRIBUTION,
  POSTER_H,
  POSTER_RADIUS,
  POSTER_W,
  POSTER_X,
  POSTER_Y,
  RIGHT_W,
  RIGHT_X,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "../constants";
import { accentForGenre } from "../poster";
import { el, type OgElement } from "./elements";
import type { loadOgFonts } from "./fonts";
import { ensureRenderStack, satori } from "./init";
import { svgToPng } from "./png";

export type CardRenderInput = {
  title: string;
  releaseDate: string;
  genres: string[];
  posterDataUrl: string | null;
  accentHex: string;
  /** When set, shows "today's pick · {date}" overline (today route only). */
  todayDate?: string;
  brand?: string;
  footerUrl?: string;
};

function releaseYear(releaseDate: string): string | null {
  const s = releaseDate.trim();
  if (s.length >= 4 && /^\d{4}/.test(s)) return s.slice(0, 4);
  return null;
}

function buildCardTree(input: CardRenderInput): OgElement {
  const accent = input.accentHex;
  const brand = input.brand ?? DEFAULT_BRAND;
  const footerUrl = input.footerUrl ?? DEFAULT_FOOTER_URL;
  const year = releaseYear(input.releaseDate);
  const genres = input.genres.slice(0, 3);

  const posterNode: OgElement = input.posterDataUrl
    ? el("img", {
        src: input.posterDataUrl,
        style: {
          width: POSTER_W,
          height: POSTER_H,
          objectFit: "cover",
          borderRadius: POSTER_RADIUS,
        },
      })
    : el("div", {
        style: {
          width: POSTER_W,
          height: POSTER_H,
          borderRadius: POSTER_RADIUS,
          backgroundColor: accent,
        },
      });

  const textChildren: Array<OgElement | string> = [];

  if (input.todayDate) {
    textChildren.push(
      el("div", {
        style: {
          fontSize: 22,
          fontWeight: 600,
          color: accent,
          fontFamily: "Butler",
          marginBottom: 18,
        },
        children: `today's pick · ${input.todayDate}`,
      }),
    );
  }

  textChildren.push(
    el("div", {
      style: {
        fontSize: 60,
        fontWeight: 700,
        color: TEXT_PRIMARY,
        fontFamily: "Butler",
        lineHeight: 1.08,
        maxWidth: RIGHT_W,
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxHeight: 140,
      },
      children: input.title.trim() || "Untitled",
    }),
  );

  if (year) {
    textChildren.push(
      el("div", {
        style: {
          fontSize: 28,
          fontWeight: 500,
          color: TEXT_SECONDARY,
          fontFamily: "Butler",
          marginTop: 20,
        },
        children: year,
      }),
    );
  }

  const pillRow: OgElement[] = [];
  for (const g of genres) {
    pillRow.push(
      el("div", {
        style: {
          display: "flex",
          alignItems: "center",
          paddingLeft: 18,
          paddingRight: 18,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 999,
          backgroundColor: accentForGenre([g]),
          color: COSMOS_BLACK,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "Butler",
          marginRight: 12,
        },
        children: g,
      }),
    );
  }

  if (pillRow.length > 0) {
    textChildren.push(
      el("div", {
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 24,
          maxWidth: RIGHT_W,
        },
        children: pillRow,
      }),
    );
  }

  textChildren.push(
    el("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        marginTop: "auto",
      },
      children: [
        el("div", {
          style: {
            fontSize: 30,
            fontWeight: 500,
            color: TEXT_PRIMARY,
            fontFamily: "Butler",
          },
          children: brand,
        }),
        el("div", {
          style: {
            fontSize: 20,
            fontWeight: 400,
            color: TEXT_SECONDARY,
            fontFamily: "Butler",
            marginTop: 6,
          },
          children: footerUrl,
        }),
        el("div", {
          style: {
            fontSize: 16,
            fontWeight: 400,
            color: TEXT_SECONDARY,
            fontFamily: "Butler",
            marginTop: 4,
          },
          children: TMDB_OG_ATTRIBUTION,
        }),
      ],
    }),
  );

  return el("div", {
    style: {
      width: CANVAS_W,
      height: CANVAS_H,
      display: "flex",
      flexDirection: "row",
      backgroundColor: COSMOS_BLACK,
      fontFamily: "Butler",
    },
    children: [
      el("div", {
        style: {
          width: 6,
          height: CANVAS_H,
          backgroundColor: accent,
          flexShrink: 0,
        },
      }),
      el("div", {
        style: {
          display: "flex",
          flexDirection: "row",
          flex: 1,
          paddingLeft: POSTER_X - 6,
          paddingRight: 60,
          alignItems: "center",
        },
        children: [
          posterNode,
          el("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              marginLeft: 56,
              width: RIGHT_W,
              height: POSTER_H,
              justifyContent: "flex-start",
            },
            children: textChildren,
          }),
        ],
      }),
    ],
  });
}

export async function renderMovieCardPng(
  input: CardRenderInput,
  fonts: Awaited<ReturnType<typeof loadOgFonts>>,
): Promise<Uint8Array> {
  await ensureRenderStack();
  const tree = buildCardTree(input);
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: CANVAS_W,
    height: CANVAS_H,
    fonts,
  });
  return svgToPng(svg);
}
