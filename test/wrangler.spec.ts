import { describe, expect, it } from "vitest";
import wranglerConfigSource from "../wrangler.toml?raw";

const wranglerConfig = wranglerConfigSource.replace(/\r\n/g, "\n");

const expectedRoutes = [
  "themoviecosmos.com/og/*",
  "themoviecosmos.com/movie/*",
] as const;

function configuredRoutePatterns(source: string): string[] {
  return [...source.matchAll(/^pattern = "([^"]+)"$/gm)].map((match) => match[1]!);
}

describe("Cloudflare route configuration", () => {
  it("keeps only the active Worker-owned routes in the executable Wrangler config", () => {
    expect(wranglerConfig).toContain("run_worker_first = true");
    expect(configuredRoutePatterns(wranglerConfig)).toEqual([...expectedRoutes]);

    for (const pattern of expectedRoutes) {
      expect(wranglerConfig).toContain(
        `pattern = "${pattern}"\nzone_name = "themoviecosmos.com"`,
      );
    }
  });
});
