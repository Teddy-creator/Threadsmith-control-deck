# Pending Proposal Visibility v1

> Status: planned for implementation.
> Scope: Cross-Agent State Bridge v1 proposal visibility.

## Goal

Make pending writeback proposals visible from the operator surface without
adding UI or automatic adoption.

This continues Cross-Agent State Bridge v1. It does not change the manual
Threadsmith gate boundary.

## Scope

- Add a proposal visibility summary that scans:
  - `.threadsmith/proposals/*.json`
  - `.threadsmith/proposal-reviews/*.json`
- Classify proposals as pending, reviewed, or invalid.
- For pending proposals, show proposal id, agent/provider, role, phase, status,
  createdAt, and recommended review command.
- Add a CLI command for operators.
- Add focused tests and smoke coverage.
- Update bridge docs and `.threadsmith` truth.

## Out Of Scope

- No frontend UI.
- No automatic proposal adoption.
- No direct external-agent committed truth writes.
- No multi-provider execution.
- No release publishing.
- No global installed skill modification.

## Done When

- `npm run threadsmith:proposal-status -- .` reports pending proposal visibility.
- A smoke test proves pending, reviewed, and invalid proposals are classified.
- Docs explain how operators use the command before review/adoption.
- Project truth and diff hygiene pass.

## Verification

- `npm run smoke:proposal-status`
- `npm run test --workspace @threadsmith/fs-bridge -- proposalVisibility`
- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `git diff --check`
- `jq empty .threadsmith/*.json docs/fixtures/cross-agent-proposals/*.json`

## Stop Condition

Stop after CLI visibility, tests, docs, and truth closeout are accepted. Do not
continue into frontend UI or automatic adoption in this slice.
