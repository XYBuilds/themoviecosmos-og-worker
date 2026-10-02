# OG Worker Repository Guidance

The OG Worker is an independently owned Cloudflare Worker for movie Open Graph routes on `themoviecosmos.com`. Chronicle owns the OG Index producer contract (C-002). This repository owns KV parsing, HTML metadata, PNG rendering, caching, fallback, route handling, and Worker deployment.

## Agent skills

### Issue tracker

Issues live in the OG Worker GitHub repository under XYBuilds. Use `gh` for Issue and pull-request operations. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md). Provider Issue numbers and URLs are aliases; portable identities use `tmc:og-worker:<ULID>`.

### Triage labels

Triage uses the five canonical Matt skills labels. See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md).

### Domain docs

Read `docs/adr/` for Worker-local decisions. Current cross-repository behavior lives in Chronicle's OG Index / OG Worker contract. Create or update `CONTEXT.md` and ADRs only when domain terms or durable design decisions are actually resolved through the domain-modeling workflow. See [`docs/agents/domain.md`](docs/agents/domain.md).

## Delivery workflow

Repository delivery is **tool-neutral**. External discovery, specification, and review skills may help agents work, but they are not repository authority.

Required delivery checks, regardless of host:

- Work from an Issue-owned branch off an up-to-date default base (`main` unless otherwise specified).
- Run the verification that matches the changed scope (`npm test`, `npm run typecheck`, and `npm run dry-run` only when packaging or deployment configuration changes and the required local environment is available). Never run `npm run deploy` without explicit deployment authorization. The secret-bearing deployment dry run is not required for non-deploying P0 gates.
- Delivery Issues and pull requests must include an explicit human risk declaration (R0–R3 + protected surfaces). Do not invent a path classifier.
- Do not rewrite accepted ADRs as silent edits.
- **Human merge and Issue closure approval are mandatory.** Agents may prepare evidence and open a pull request when authorized, but must not merge or close the Issue without explicit human approval.

Ignored `.env` values are replaceable Bitwarden deployment copies, not the secrets authority. Rollback follows C-002 and never restores retired Today routes, keys, or behavior.
