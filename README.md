# themoviecosmos-og-worker

Cloudflare Worker for the movie Open Graph routes on `themoviecosmos.com`.

**Current cross-repository contract:** [Chronicle OG Index / OG Worker contract](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/system/og-index-worker-contract.md). It defines the producer/consumer boundary and observable compatibility rules. This README remains authoritative for Worker-local implementation, configuration, testing, and deployment.

**Historical note:** Phase 34 deployment guides and plans are evidence only. Do not execute their Today steps; `/today`, `/og/today.png`, `/share/today`, and KV `today` are retired.

## Routes

| Path | Behavior |
| --- | --- |
| `GET /og/movie/:id.png?v={G}-{M}` | KV `movie:{id}` → poster + title card; missing or unreadable KV data → brand PNG |
| `GET /og/brand.png?v=og-brand-og-v1` | Brand fallback |
| `GET /movie/:id` (HTML) | SPA `index.html` + injected `og:*` / `twitter:*` (no UA split) |

> **Retired routes — do not execute as active setup:** `/today`, `/og/today.png`, and `/share/today` return side-effect-free `404 Not Found` for `GET` and `HEAD`, including query strings. Keep the retired paths bound to this Worker ahead of the Pages fallback so they cannot serve the SPA shell. Reuse requires an explicit contract migration.

PNG: wrong or missing `v` → **302** to canonical URL (immutable edge cache).

HTML: fetches production `/index.html` as shell; `og:url` matches request path + query (`?lang=` OK; not in PNG `v`).

## Prerequisites

1. **Current OG Index contract:** [Chronicle `og-index-worker-contract.md`](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/system/og-index-worker-contract.md).
2. **P34.3 current movie-only KV projection:** KV namespace `OG_INDEX` populated with `meta:G` and `movie:*`. See [P34.3 OG Index KV 上线操作指南](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/guides/P34.3%20OG%20Index%20KV%20上线操作指南.md).
3. Cloudflare account with Workers deploy permission.

## Setup

```bash
npm install
```

**SSOT for secrets & KV namespace id:** `.env` (gitignored). Wrangler does **not** read `.env` by itself.

1. Copy `.env.example` → `.env` and set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `OG_INDEX_KV_NAMESPACE_ID` (same as main-repo P34.3).
2. Deploy (loads `.env`, syncs `wrangler.toml` KV `id` from `.env`, then `wrangler deploy`):

```powershell
cd E:\projects\themoviecosmos-og-worker
npm run deploy
```

Manual steps only:

```powershell
. .\scripts\use-env.ps1          # CLOUDFLARE_* for whoami
npm run sync-wrangler            # OG_INDEX_KV_NAMESPACE_ID → wrangler.toml
wrangler whoami
```

Do **not** hand-edit `wrangler.toml` `id` / `preview_id`; they are overwritten from `.env` on `npm run deploy` / `sync-wrangler`.

## Commands

```bash
npm test              # hash8, poster URL, version helpers
npm run typecheck
npm run dev           # wrangler dev (bind KV + assets locally)
npm run dry-run       # bundle size check without deploy
npm run deploy        # production deploy (routes are managed in wrangler.toml)
```

## Deploy checklist

1. `npm test && npm run dry-run`
2. `npm run deploy` applies the Worker and the route configuration in `wrangler.toml`. The deploy token must include `Workers Routes: Edit`:
   - `themoviecosmos.com/og/*` → this worker
   - `themoviecosmos.com/movie/*` → this worker
   - `themoviecosmos.com/today*` → this worker (retired-route guard; returns 404 before Pages fallback)
   - `themoviecosmos.com/share/today*` → this worker (retired-route guard; returns 404 before Pages fallback)
3. Smoke after deployment:
   - `curl -I "https://themoviecosmos.com/og/brand.png?v=og-brand-og-v1"`
   - `curl -s "https://themoviecosmos.com/movie/550" | findstr /i "og:image og:url og:title"`
   - `curl -s -o NUL -w "%{http_code}" "https://themoviecosmos.com/today?lang=zh"` (expect `404`)
   - `curl -s -o NUL -w "%{http_code}" "https://themoviecosmos.com/og/today.png?cache=bust"` (expect `404`)
   - `curl -s -o NUL -w "%{http_code}" "https://themoviecosmos.com/share/today"` (expect `404`)
   - `curl -s -o NUL -w "%{http_code}" "https://themoviecosmos.com/share/today?lang=zh"` (expect `404`)
   - Repeat the two `/share/today` requests with `curl -I` to verify the `HEAD` path also returns `404` without an SPA response.

## Version algorithm (`v = {G}-{M}`)

- **`G`**: KV `meta:G`. The current Chronicle producer derives it from `galaxy_data.json` `meta.version`; the Worker treats it as an opaque, non-empty generation.
- **`M`**: Worker-owned `hash8(layoutVersion, id, title, release_date, genres[0], poster_url, placeholderFlag)`.
- **`layoutVersion`**: `og-v1` (`src/constants.ts` `LAYOUT_VERSION`).
- **HTML/PNG edge case:** HTML computes the normal-poster `M` before poster download. PNG computes `M` after download; a failed poster may cause one extra canonical `302` to the placeholder version. This is a known runtime behavior, not a permanent redirect-count guarantee.

Golden fixture (Fight Club id 550): `M = 90cacf9f` — see `test/version.spec.ts`.

## Rendering stack

- Layout ported from main-repo movie OG renderer (1200×630, genre palette, Butler brand).
- **Satori** → SVG → **@resvg/resvg-wasm** → PNG (Workers-compatible; no DOM canvas).
- Posters: TMDB `image.tmdb.org` only; `w780` → `w342`; failure → accent placeholder (`placeholderFlag=1`).

## Rollback

Cross-repository breaking changes use a **coordinated best-effort cutover**, not an atomic deployment. If a cutover fails:

1. Stop or roll back the Chronicle producer first so it cannot expand incompatible KV state.
2. Roll back this Worker.
3. Retain newly written KV keys and values for diagnosis; do not delete production state as an emergency reflex.
4. Repair or replay through the producer's explicit recovery path.

For the Worker-only rollback procedure, see the [Chronicle current contract](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/system/og-index-worker-contract.md). The historical [P34.9 测试与验收回滚指南](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/guides/P34.9%20%E6%B5%8B%E8%AF%95%E4%B8%8E%E9%AA%8C%E6%94%B6%E5%9B%9E%E6%BB%9A%E6%8C%87%E5%8D%97.md) is evidence only; do not execute its Today recovery steps.

Quick Worker-only rollback: deploy the last known-good Worker commit and its matching `wrangler.toml`. If the Pages fallback is intentionally accepted, remove the route entries through a reviewed configuration change; do not rely on an unmanaged Dashboard-only override. Keep the retired routes bound in the normal configuration so Pages cannot turn them back into SPA responses.