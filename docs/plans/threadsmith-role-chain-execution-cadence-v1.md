# Threadsmith Role Chain Execution Cadence v1

> Status: accepted.
> Scope: `$threadsmith` drive-mode cadence and output contract.

## Goal

Make `$threadsmith` pause between phases instead of pausing after every routine
role transition.

## Problem

The existing anti-repeat and phase narrative rules improved wording, but
`drive` still treated executor, reviewer, verifier, and closeout as separate
operator approval points. In practice this made the user approve every role
handoff even after approving the phase.

## Scope

- Redefine `drive` as an approved phase role chain, not one role at a time.
- Keep planner, executor, reviewer, verifier, and closeout gates intact.
- Stop mid-chain only on real gates: scope change, blocker, failed
  verification, missing evidence, destructive action, credentials, writeback
  failure, stale truth, or contradictory packets.
- Reserve `下一 phase 预览` for closeout or real phase boundaries.
- Add contract verification for this cadence rule.

## Out Of Scope

- No frontend changes.
- No runtime command implementation changes.
- No automatic multi-agent scheduling.
- No release publishing.

## Done When

- `SKILL.md` states the default rhythm as phase-boundary pauses, not role
  pauses.
- `references/action-contracts.md` documents the role-chain cadence.
- Contract verification fails if this rule is removed.
- Repository and installed global skill are in sync.

## Verification

- `npm run verify:skill-contract`
- `npm run verify:project-truth`
- `npm run verify:skill-sync`
- `git diff --check`
