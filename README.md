# themoviecosmos-og-worker

Cloudflare Worker for **Phase 34** dynamic Open Graph PNGs on `themoviecosmos.com`.

Main-repo SSOT: [phase_34_social_preview_distribution.plan.md](https://github.com/XYBuilds/chronicle_v3_3d_galaxy/blob/main/.cursor/plans/phase_34_social_preview_distribution.plan.md) §34.4.

## Routes (PNG only — HTML meta injection is **34.5**)

| Path | Behavior |
|------|----------|
| `GET /og/movie/:id.png?v={G}-{M}` | KV `movie:{id}` → poster + title card; KV miss → brand |
| `GET /og/today.png?v={G}-{M}` | KV `today` + `movie:{id}`; overline `today's pick · {date}` |
| `GET /og/brand.png?v=og-brand-og-v1` | Brand fallback |

Wrong or missing `v` → **302** to canonical URL (immutable edge cache).

## Prerequisites

1. **P34.3** KV namespace `OG_INDEX` populated (`meta:G`, `today`, `movie:*`). See main-repo `docs/guides/P34.3 OG Index KV 上线操作指南.md`.
2. Cloudflare account with Workers deploy permission.

## Setup

```bash
npm install
```

Edit `wrangler.toml` → replace `REPLACE_WITH_OG_INDEX_NAMESPACE_ID` with your KV namespace id (from `wrangler kv namespace list` or the P34.3 guide).

Optional local secrets (`.dev.vars`, gitignored):

```env
# wrangler dev uses wrangler.toml vars by default
```

## Commands

```bash
npm test              # hash8, poster URL, version helpers
npm run typecheck
npm run dev           # wrangler dev (bind KV + assets locally)
npm run dry-run       # bundle size check without deploy
npm run deploy        # production deploy (after route binding in dashboard)
```

## Deploy checklist

1. `npm test && npm run dry-run`
2. `npm run deploy`
3. In Cloudflare dashboard → **Workers Routes** (same zone as Pages):
   - `themoviecosmos.com/og/*` → this worker (before SPA fallback)
4. Smoke:
   - `curl -I "https://themoviecosmos.com/og/brand.png?v=og-brand-og-v1"`
   - `curl -I "https://themoviecosmos.com/og/today.png"` (expect 302 with `v=`)

## Version algorithm (`v = {G}-{M}`)

- **`G`**: KV `meta:G` (`galaxy_data.json` `meta.version`)
- **`M`**: `hash8(layoutVersion, id, title, release_date, genres[0], poster_url, placeholderFlag)`
- **Today**: same fields + `today.date` in hash input
- **`layoutVersion`**: `og-v1` (env `LAYOUT_VERSION`)

Golden fixture (Fight Club id 550): `M = 90cacf9f` — see `test/version.spec.ts`.

## Rendering stack

- Layout ported from main-repo `scripts/cron/render_og_today.py` (1200×630, genre palette, Butler brand).
- **Satori** → SVG → **@resvg/resvg-wasm** → PNG (Workers-compatible; no DOM canvas).
- Posters: TMDB `image.tmdb.org` only; `w780` → `w342`; failure → accent placeholder (`placeholderFlag=1`).

## Rollback

Unbind `/og/*` Worker routes in dashboard; SPA + static meta remain until 34.5/34.6.
