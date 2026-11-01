# Execution-skills pilot: expiry boundary

Date: 1 November 2026. Host: this Codex desktop session. Model/version not independently captured. This is a same-session synthetic smoke test by the skill author, not a separate-agent evaluation or no-skill comparison.

Scope: TASK-001/REQ-001 required a pure numeric expiry check to accept before expiration and reject at or after it. The scratch project had a v1 feature contract, brief, architecture, ADR and criterion-to-test plan. The plan-stage structural check passed.

Observed sequence:

1. Added a boundary regression alongside before/after cases. `node --test expiry.test.mjs` exited 1: two tests passed, equality failed (`true !== false`).
2. Changed `return now <= expiresAt` to `return now < expiresAt`. The same command exited 0 with three tests passed, no failures or skips. An implementation note recorded scope, observed before/after outcomes and verification limitations.
3. A separate tc-test-style pass read the final input state and reran the tests without changing production code. Exit 0; all three criterion-specific assertions passed. A new observational verification report recorded the input hashes and limits.

Final observed SHA-256 values:

- `expiry.mjs`: `8578c68833ef7a497e79e03be3b35df25af4c69b301b115c32d5c7447bcbe48a`
- `expiry.test.mjs`: `ce8d84e5708f4de6f58c56a05ae15d5ce80dea9a1cb6a92014436ee3a897e034`

The code, contract and session notes were created in a disposable local scratch project, not a production application. This report records observations, not a cryptographically trusted receipt. No native host installation, model-quality benchmark, environment-failure scenario or public deployment was evaluated. The remaining scenario cards still require execution.
