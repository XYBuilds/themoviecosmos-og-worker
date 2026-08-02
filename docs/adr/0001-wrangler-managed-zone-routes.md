---
status: accepted
---

# Manage production routes in Wrangler

The OG Worker keeps its Cloudflare zone routes in `wrangler.toml` as the executable source of truth instead of relying on manually maintained Dashboard routes. This makes the Worker routes reproducible with deployment and ensures retired paths stay ahead of the Pages SPA fallback; the `/share/today*` pattern is intentional because Cloudflare route patterns cannot contain query parameters, so the trailing wildcard is required to match requests such as `/share/today?lang=zh`. The Worker still exposes only its registered active routes and returns 404 for all other paths.

The deployment token must include `Workers Routes: Edit` for the route configuration to converge.