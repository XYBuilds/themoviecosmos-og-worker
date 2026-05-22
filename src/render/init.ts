import { initWasm } from "@resvg/resvg-wasm";
import satori, { init as initSatori } from "satori/standalone";

export type FontBundle = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — vendored wasm modules for Workers
import resvgWasm from "../../vendors/resvg.wasm?module";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — vendored wasm modules for Workers
import yogaWasm from "../../vendors/yoga.wasm?module";

let renderReady: Promise<void> | null = null;

/** One-time Satori (yoga) + Resvg wasm init for Cloudflare Workers. */
export function ensureRenderStack(): Promise<void> {
  if (!renderReady) {
    renderReady = (async () => {
      await Promise.all([
        initWasm(resvgWasm as WebAssembly.Module),
        initSatori(yogaWasm as WebAssembly.Module),
      ]);
      console.log("[og-worker] render stack ready (satori/standalone + resvg)");
    })();
  }
  return renderReady;
}

export { satori };
