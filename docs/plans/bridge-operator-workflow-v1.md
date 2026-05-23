# Bridge Operator Workflow v1

> Status: planned for implementation.
> Scope: Cross-Agent State Bridge v1 usability and operator workflow.

## Goal

Turn the already implemented Cross-Agent State Bridge capabilities into a
clear day-to-day workflow that an operator can follow without confusing:

- committed truth vs derived handoff;
- proposal vs accepted project state;
- review vs explicit adoption;
- cross-agent handoff vs automatic multi-agent scheduling.

This continues Cross-Agent State Bridge v1. It does not start automatic
multi-agent scheduling.

## Scope

- Tighten the operator guide into a concrete sequence:
  prepare truth -> refresh bridge -> delegate narrow task -> receive proposal ->
  check queue -> review -> explicitly adopt or recover -> verify -> close out.
- Add copy-paste task prompts for common external-agent roles:
  reviewer, researcher, verifier, docs helper, and executor-without-acceptance.
- Add a compact command cheat sheet for bridge refresh, proposal status, review,
  adoption, and smoke verification.
- Clarify which files are read-only source truth, derived packets, runtime
  proposal artifacts, and adopted committed truth.
- Add recovery branches for stale handoff, stale adapter, stale proposal,
  wrong phase, unsafe proposal, and missing evidence.
- Keep all external agents default read-only plus writeback proposal.

## Out Of Scope

- No automatic multi-agent scheduling.
- No external agent direct writes to committed truth.
- No frontend UI changes.
- No release publishing.
- No global installed skill mutation.
- No hosted state store, embeddings, or semantic memory.

## Done When

- A new operator can understand how to use Threadsmith as a local
  project-level state store and cross-agent bridge from one guide.
- The guide names the exact files each actor reads and writes.
- The guide includes copy-paste prompts for safe external-agent delegation.
- The guide explains how to recover from stale or unsafe proposals.
- The guide explicitly says what remains manual and what is not automated.
- Project truth records this as the active phase without reopening completed
  Proposal Adoption and Round-trip v1 work.

## Verification

- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `npm run smoke:proposal-status`
- `npm run smoke:proposal-roundtrip`
- `git diff --check`

## Stop Condition

Stop after the operator workflow is documented, truth is updated, and the
existing bridge verification commands pass. Do not implement automatic
multi-agent dispatch in this slice.
