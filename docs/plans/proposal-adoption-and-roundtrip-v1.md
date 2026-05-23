# Proposal Adoption and Round-trip v1

> Status: planned for implementation.
> Scope: Cross-Agent State Bridge v1 operator command surface.

## Goal

Add an explicit, conservative proposal adoption command, then verify a complete
external-agent round trip in an isolated smoke project.

This continues Cross-Agent State Bridge v1. It does not start automatic
multi-agent scheduling.

## Scope

- Add an opt-in adoption command for already reviewed `accept-plan` proposals.
- Apply only adoption plan steps that target allowed `.threadsmith` committed
  truth files.
- Validate the resulting state before writing it.
- Refuse stale, rejected, needs-recovery, missing-review, or invalid proposals.
- Add focused tests and an isolated round-trip smoke:
  external proposal -> Threadsmith review -> explicit adoption -> committed truth
  updated.
- Update operator docs and `.threadsmith` truth.

## Out Of Scope

- No automatic multi-agent dispatch.
- No direct external-agent committed truth writes.
- No frontend UI.
- No release publishing.
- No global installed skill modification.
- No adoption of source-code changes from proposal artifacts.

## Done When

- `npm run threadsmith:adopt-proposal -- . <proposal-id>` safely applies an
  accepted adoption plan.
- Adoption cannot run before proposal review returns `accept-plan`.
- Adoption validates target paths and resulting JSON schemas before writing.
- Round-trip smoke proves an external-agent style proposal can be reviewed and
  adopted into committed truth.
- Project truth and diff hygiene pass.

## Verification

- `npm run smoke:proposal-roundtrip`
- `npm run test --workspace @threadsmith/fs-bridge -- writebackProposalAdoption`
- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `git diff --check`
- `jq empty .threadsmith/*.json docs/fixtures/cross-agent-proposals/*.json`

## Stop Condition

Stop after explicit proposal adoption and isolated round-trip verification are
accepted. Do not continue into automatic multi-agent scheduling in this slice.
