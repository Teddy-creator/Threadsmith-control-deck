# Proposal Review Workflow v1

> Status: planned for implementation.
> Scope: cross-agent bridge v1 follow-up.

## Goal

Give operators a deterministic command for reviewing an external agent
writeback proposal and writing a proposal-review artifact.

The command should turn an existing
`.threadsmith/proposals/<proposal-id>.json` file into one of three decisions:

- `accept-plan`
- `reject`
- `needs-recovery`

It must not apply committed truth automatically.

## Scope

- Add a command-line entry that reviews one proposal by id.
- Validate that the proposal exists and matches the domain schema.
- Detect unsafe proposal states:
  - stale phase;
  - self-accepted status;
  - direct proposal-artifact mutation;
  - final acceptance without evidence;
  - missing recover condition.
- Emit `.threadsmith/proposal-reviews/<proposal-id>.json`.
- Reuse existing domain schema and manual adoption plan semantics.
- Add focused tests for accept-plan, reject, and needs-recovery paths.
- Document the command in the operator guide and contract closeout doc.

## Out Of Scope

- No proposal review UI.
- No automatic committed-truth mutation.
- No external provider execution.
- No multi-provider routing implementation.
- No frontend redesign.
- No global skill installation or modification.

## Done When

- A package script or CLI entry can review a proposal by id.
- Safe proposals produce `accept-plan` with manual adoption steps.
- Unsafe proposals produce `reject` or `needs-recovery` with clear reasons.
- Review artifacts are readable through existing fs-bridge helpers.
- Documentation explains that `accept-plan` is still not accepted truth.
- Focused tests and project truth checks pass.

## Verification

- `npm run test --workspace @threadsmith/domain -- writebackProposalReview`
- `npm run test --workspace @threadsmith/fs-bridge -- writebackProposal`
- `npm run threadsmith:review-proposal -- . <fixture-id>` or equivalent smoke
- `npm run verify:project-truth`
- `git diff --check`
- `jq empty .threadsmith/*.json`

## Stop Condition

Stop and route to recovery if the implementation would require auto-applying
truth updates, changing frontend behavior, or granting external agents direct
write permission.

