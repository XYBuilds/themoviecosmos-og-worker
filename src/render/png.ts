import { initWasm, Resvg } from "@resvg/resvg-wasm";
// Wrangler bundles the WASM module at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — .wasm module has no TS types in workers bundler
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";

import { CANVAS_W } from "../constants";

let wasmInit: Promise<void> | null = null;

export function ensureResvgWasm(): Promise<void> {
  if (!wasmInit) {
    wasmInit = initWasm(resvgWasm);
  }
  return wasmInit;
}

export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureResvgWasm();
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
