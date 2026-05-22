import { Resvg } from "@resvg/resvg-wasm";

import { CANVAS_W } from "../constants";
import { ensureRenderStack } from "./init";

export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureRenderStack();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CANVAS_W },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  assertPng(png);
  return png;
}

function assertPng(png: Uint8Array): void {
  if (png.byteLength < 8) {
    throw new Error("PNG encode produced empty buffer");
  }
}
