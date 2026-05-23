# External-Agent Fixture Pack v1

> Status: planned for implementation.
> Scope: Cross-Agent State Bridge v1 proposal examples and validation.

## Goal

Add a small, reviewable fixture pack that shows how external Codex-like,
Claude-like, and generic agents should return writeback proposals, and how
Threadsmith classifies safe, stale, conflicting, and unsafe proposals.

This continues Cross-Agent State Bridge v1. It does not add automatic
multi-provider execution.

## Scope

- Add fixtures for:
  - happy-path proposal that produces `accept-plan`;
  - stale proposal created before committed truth freshness;
  - conflicting proposal for the wrong phase;
  - unsafe external self-acceptance proposal.
- Add an isolated smoke command that reviews the fixture pack against a
  temporary project and asserts the expected decisions.
- Document how operators can read the fixture pack.
- Refresh `.threadsmith` truth for this slice.

## Out Of Scope

- No frontend work.
- No automatic multi-provider execution.
- No external agent direct writes to committed truth.
- No proposal review UI.
- No release publishing.
- No global installed skill modification.

## Done When

- Fixture files are committed under `docs/fixtures/cross-agent-proposals/`.
- `npm run smoke:proposal-fixtures` proves fixture decisions are stable.
- Cross-Agent State Bridge v1 docs link to the fixture pack.
- Project truth and diff hygiene pass.

## Verification

- `npm run smoke:proposal-fixtures`
- `npm run test --workspace @threadsmith/fs-bridge -- writebackProposalWorkflow`
- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `git diff --check`
- `jq empty .threadsmith/*.json`

## Stop Condition

Stop after fixtures, smoke coverage, docs, and truth closeout are accepted.
Do not continue into pending proposal visibility or UI work in this slice.
