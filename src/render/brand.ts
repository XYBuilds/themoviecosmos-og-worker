import {
  CANVAS_H,
  CANVAS_W,
  COSMOS_BLACK,
  DEFAULT_ACCENT,
  DEFAULT_BRAND,
  DEFAULT_FOOTER_URL,
  RIGHT_X,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "../constants";
import { el } from "./elements";
import type { loadOgFonts } from "./fonts";
import { ensureRenderStack, satori } from "./init";
import { svgToPng } from "./png";

export async function renderBrandCardPng(
  fonts: Awaited<ReturnType<typeof loadOgFonts>>,
  opts?: { brand?: string; footerUrl?: string },
): Promise<Uint8Array> {
  const brand = opts?.brand ?? DEFAULT_BRAND;
  const footerUrl = opts?.footerUrl ?? DEFAULT_FOOTER_URL;

  await ensureRenderStack();

  const tree = el("div", {
    style: {
      width: CANVAS_W,
      height: CANVAS_H,
      display: "flex",
      flexDirection: "row",
      backgroundColor: COSMOS_BLACK,
    },
    children: [
      el("div", {
        style: {
          width: 6,
          height: CANVAS_H,
          backgroundColor: DEFAULT_ACCENT,
        },
      }),
      el("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: RIGHT_X,
          flex: 1,
        },
        children: [
          el("div", {
            style: {
              fontSize: 72,
              fontWeight: 500,
              color: TEXT_PRIMARY,
              fontFamily: "Butler",
              lineHeight: 1.1,
            },
            children: brand,
          }),
          el("div", {
            style: {
              fontSize: 28,
              fontWeight: 400,
              color: TEXT_SECONDARY,
              fontFamily: "Butler",
              marginTop: 20,
            },
            children: footerUrl,
          }),
          el("div", {
            style: {
              fontSize: 22,
              fontWeight: 500,
              color: TEXT_SECONDARY,
              fontFamily: "Butler",
              marginTop: 32,
              maxWidth: 720,
            },
            children:
              "Explore ~60,000 films as a semantic galaxy — The Movie Cosmos",
          }),
        ],
      }),
    ],
  });

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: CANVAS_W,
    height: CANVAS_H,
    fonts,
  });
  return svgToPng(svg);
}
