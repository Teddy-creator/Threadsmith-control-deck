# Stale Proposal Recovery v1

> Status: planned for implementation.
> Scope: cross-agent bridge v1 hardening.

## Goal

Make proposal review safer when a writeback proposal was created before the
current committed truth changed.

## Scope

- Detect proposal freshness against committed truth freshness.
- Route stale proposals to `needs-recovery` instead of `accept-plan`.
- Keep phase mismatch recovery behavior.
- Keep evidence failure as `reject`.
- Add focused tests for stale truth recovery.
- Document the freshness boundary in the operator guide.

## Out Of Scope

- No proposal review UI.
- No automatic committed-truth mutation.
- No multi-provider execution.
- No frontend work.
- No global skill modification.
- No release publishing.

## Done When

- A proposal older than current project truth produces `needs-recovery`.
- The recovery action tells the operator to sync/rebase/regenerate the proposal.
- Safe current proposals still produce `accept-plan`.
- Focused tests and project truth checks pass.

## Verification

- `npm run test --workspace @threadsmith/fs-bridge -- writebackProposalWorkflow`
- `npm run smoke:review-proposal`
- `npm run verify:project-truth`
- `git diff --check`
- `jq empty .threadsmith/*.json`

