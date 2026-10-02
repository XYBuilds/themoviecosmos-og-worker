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

> **Retired Today URLs:** `/today` and `/share/today` are not Worker-owned; they follow Chronicle ordinary invalid-path handling. `/og/today.png` is an ordinary unknown path inside the active `/og/*` Worker namespace. Do not add a Today handler, redirect, SPA rewrite, KV read, brand fallback, or compatibility layer. Reuse requires an explicit contract migration.

PNG: wrong or missing `v` → **302** to canonical URL (immutable edge cache).

HTML: fetches production `/index.html` as shell; `og:url` matches request path + query (`?lang=` OK; not in PNG `v`).

## Prerequisites

1. **Current OG Index contract:** [Chronicle `og-index-worker-contract.md`](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/system/og-index-worker-contract.md).
2. **P34.3 current movie-only KV projection:** KV namespace `OG_INDEX` populated with `meta:G` and `movie:*`. See [P34.3 OG Index KV 上线操作指南](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/docs/guides/P34.3%20OG%20Index%20KV%20%E4%B8%8A%E7%BA%BF%E6%93%8D%E4%BD%9C%E6%8C%87%E5%8D%97.md).
3. Cloudflare account with Workers deploy permission.

## Setup

```bash
npm install
```

**Secrets authority:** Bitwarden. Ignored `.env` values are replaceable deployment copies, not the secrets authority. Wrangler does **not** read `.env` by itself.

1. Copy `.env.example` → `.env` and fill deployment copies of `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `OG_INDEX_KV_NAMESPACE_ID` from Bitwarden (same namespace as Chronicle P34.3).
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
3. Smoke after deployment:
   - `curl -I "https://themoviecosmos.com/og/brand.png?v=og-brand-og-v1"`
   - `curl -s "https://themoviecosmos.com/movie/550" | findstr /i "og:image og:url og:title"`
   - Compare `GET`/`HEAD` `/og/today.png` and `/og/today.png?cache=bust` with `/og/unknown.png` (same query when present). Expect the same status, content type, and body as an ordinary unknown `/og/*` path, with no PNG or HTML payload.
   - Compare `GET`/`HEAD` `/today`, `/today?lang=zh`, `/share/today`, and `/share/today?lang=zh` with `/unknown` (and `/unknown?lang=zh` for the query variants). Expect the same status, content-type/cache behavior, and body/SPA handling as that ordinary invalid Chronicle path. These URLs are not Worker-owned.

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

Quick Worker-only rollback: deploy the last-known-good Worker commit and its matching `wrangler.toml` through reviewed Wrangler configuration. Do not restore retired Today routes (`/today`, `/share/today`, `/og/today.png`), the `today` KV key, or Today behavior. Do not use an unmanaged Dashboard-only override and do not mutate or delete KV state as an emergency reflex. Reintroducing Today names remains a new product Initiative and contract migration, not an incident rollback; see [ADR-0002](docs/adr/0002-retired-today-follows-chronicle-invalid-path.md).

