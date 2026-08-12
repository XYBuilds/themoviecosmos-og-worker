---
status: accepted
---

# Let retired Today URLs follow Chronicle ordinary invalid-path handling

This ADR supersedes [ADR-0001](./0001-wrangler-managed-zone-routes.md) only for the retired Today guard. Wrangler remains the executable source of truth for active Worker-owned zone routes, including `run_worker_first`, KV/assets bindings, and `Workers Routes: Edit`.

The OG Worker no longer binds `themoviecosmos.com/today*` or `themoviecosmos.com/share/today*`. Those URLs follow Chronicle's ordinary invalid-path handling at the site edge. `/og/today.png` stays inside the active `themoviecosmos.com/og/*` namespace and is an ordinary unknown Worker path: it must not read KV, fetch assets or the SPA shell, render a brand or movie card, or otherwise differ from another unknown `/og/*` request. Restoring the retired Today bindings is a reviewed Wrangler configuration rollback of the last-known-good Worker commit, not a Dashboard-only override and not a KV mutation.
