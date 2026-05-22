type FontBundle = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

let cached: FontBundle[] | null = null;

export async function loadOgFonts(assets: Fetcher): Promise<FontBundle[]> {
  if (cached) return cached;

  const [interBuf, butlerBuf] = await Promise.all([
    assets.fetch("https://assets/fonts/Inter.ttf").then((r) => {
      if (!r.ok) throw new Error(`Inter.ttf assets fetch ${r.status}`);
      return r.arrayBuffer();
    }),
    assets.fetch("https://assets/fonts/Butler-Medium.ttf").then((r) => {
      if (!r.ok) throw new Error(`Butler-Medium.ttf assets fetch ${r.status}`);
      return r.arrayBuffer();
    }),
  ]);

  cached = [
    { name: "Inter", data: interBuf, weight: 400, style: "normal" },
    { name: "Inter", data: interBuf, weight: 500, style: "normal" },
    { name: "Inter", data: interBuf, weight: 600, style: "normal" },
    { name: "Inter", data: interBuf, weight: 700, style: "normal" },
    { name: "Butler", data: butlerBuf, weight: 500, style: "normal" },
  ];
  console.log(
    `[og-worker] fonts loaded inter=${interBuf.byteLength} butler=${butlerBuf.byteLength}`,
  );
  return cached;
}

/** Vitest / local: reset font cache between tests. */
export function resetFontCacheForTests(): void {
  cached = null;
}
