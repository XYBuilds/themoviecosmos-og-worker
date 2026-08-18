import { describe, expect, it } from "vitest";
import ciAdapter from "../.gitlab-ci.yml?raw";
import agentsGuide from "../AGENTS.md?raw";
import trackerGuide from "../docs/agents/issue-tracker.md?raw";
import readme from "../README.md?raw";

const ci = ciAdapter.replace(/\r\n/g, "\n");
const agents = agentsGuide.replace(/\r\n/g, "\n");
const tracker = trackerGuide.replace(/\r\n/g, "\n");
const readmeText = readme.replace(/\r\n/g, "\n");

const PRODUCTION_CREDENTIAL_NAMES = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "OG_INDEX_KV_NAMESPACE_ID",
  "OG_INDEX_KV_API_TOKEN",
] as const;

describe("P0 non-deploying GitLab CI adapter", () => {
  it("runs owner test and typecheck without deploy, dry-run, schedules, or production credentials", () => {
    expect(ci).toContain("npm test");
    expect(ci).toContain("npm run typecheck");
    expect(ci).toContain('CI_PIPELINE_SOURCE == "schedule"');
    expect(ci).toContain("when: never");
    expect(ci).toContain("git diff --check");

    expect(ci).not.toMatch(/(^|\n)schedule:/);
    expect(ci.toLowerCase()).not.toMatch(/(^|\n)deploy:/);
    expect(ci.toLowerCase()).not.toContain("pages:");
    expect(ci).not.toContain("npm run dry-run");
    expect(ci).not.toContain("npm run deploy");
    expect(ci).not.toContain("wrangler deploy");

    for (const name of PRODUCTION_CREDENTIAL_NAMES) {
      expect(ci).not.toContain(name);
    }
  });
});

describe("P0 operational guidance", () => {
  it("treats ignored environment values as replaceable Bitwarden deployment copies", () => {
    expect(readmeText).toMatch(/Bitwarden/);
    expect(readmeText).toMatch(/secrets authority/i);
    expect(readmeText).toMatch(/deployment cop(?:y|ies)/i);
    expect(readmeText).not.toMatch(/\*\*SSOT for secrets/);
  });

  it("rolls back last-known-good Worker config without restoring retired Today routes or keys", () => {
    expect(readmeText).toMatch(/last-known-good/);
    expect(readmeText).toMatch(/Do not restore retired Today/);
    expect(readmeText).toMatch(/`today` KV key/);
    expect(readmeText).not.toMatch(/restoring the two Today-specific route entries/i);
  });
});

describe("P0 agent and tracker guidance", () => {
  it("names GitLab as the writable tracker and keeps portable parent references in the Issue body", () => {
    expect(agents).toMatch(/GitLab/);
    expect(agents).toMatch(/glab/);
    expect(agents).toContain("docs/agents/issue-tracker.md");
    expect(agents).toMatch(/Human merge and Issue closure approval are mandatory/);

    expect(tracker).toMatch(/GitLab/);
    expect(tracker).toMatch(/glab/);
    expect(tracker).toContain("tmc:og-worker:");
    expect(tracker).toContain("Blocked by");
    expect(tracker).toContain("tmc:chronicle:01M08QA80S7XA8P5ZVKM3EVD8Q");
    expect(tracker).not.toMatch(/Use the `gh` CLI for all operations/);
  });
});
