import { describe, expect, it } from "vitest";
import wranglerConfigSource from "../wrangler.toml?raw";

const wranglerConfig = wranglerConfigSource.replace(/\r\n/g, "\n");

const expectedRoutes = [
  "themoviecosmos.com/og/*",
  "themoviecosmos.com/movie/*",
  "themoviecosmos.com/today*",
  "themoviecosmos.com/share/today*",
] as const;

describe("Cloudflare route configuration", () => {
  it("keeps every Worker-owned route in the executable Wrangler config", () => {
    expect(wranglerConfig).toContain("run_worker_first = true");

    for (const pattern of expectedRoutes) {
      expect(wranglerConfig).toContain(
        `pattern = "${pattern}"\nzone_name = "themoviecosmos.com"`,
      );
    }
  });
});