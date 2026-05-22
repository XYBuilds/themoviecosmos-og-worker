import type { FontBundle } from "./init";

// Butler is static TTF. Inter.ttf in main repo is variable (fvar) — satori/opentype.js fails on Workers.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — TTF bundled as binary
import butlerTtf from "../../assets/fonts/Butler-Medium.ttf";

let cached: FontBundle[] | null = null;

function toArrayBuffer(input: unknown): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input;
  if (input instanceof Uint8Array) {
    const copy = input.slice();
    return copy.buffer;
  }
  throw new Error(`unsupported font bundle type: ${typeof input}`);
}

export async function loadOgFonts(_assets?: Fetcher): Promise<FontBundle[]> {
  if (cached) return cached;

  const butlerBuf = toArrayBuffer(butlerTtf);
  if (butlerBuf.byteLength < 256) {
    throw new Error(`Butler-Medium.ttf bundle too small: ${butlerBuf.byteLength}`);
  }

  // Use Butler for all weights until a static Inter TTF subset is added to assets/.
  cached = [
    { name: "Butler", data: butlerBuf, weight: 400, style: "normal" },
    { name: "Butler", data: butlerBuf, weight: 500, style: "normal" },
    { name: "Butler", data: butlerBuf, weight: 600, style: "normal" },
    { name: "Butler", data: butlerBuf, weight: 700, style: "normal" },
  ];
  console.log(`[og-worker] fonts bundled butler=${butlerBuf.byteLength}`);
  return cached;
}

export function resetFontCacheForTests(): void {
  cached = null;
}
