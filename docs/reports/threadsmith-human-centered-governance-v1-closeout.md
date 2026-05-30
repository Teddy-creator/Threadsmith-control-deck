# Threadsmith Human-Centered Governance v1 Closeout

## Result

Human-Centered Governance v1 implements a lighter Threadsmith operating model
without removing safety gates. The core change is that ordinary work can now be
described and tested through project capability, operating mode, writeback tier,
verification level, and output budget rather than only through phase / role /
closeout language.

## Changed Capability

Threadsmith now has explicit language and runtime metadata for:

- `light-repair`
- `normal-implementation`
- `full-governance`
- `evidence-only`
- `current-context`
- `committed-truth`

In operator terms: small repairs can stay small, normal implementation can stay
short and capability-focused, and audit boundaries still keep strict truth and
verification behavior.

## Human-Centered Output

Runtime fixtures now cover these cases:

- user asks what is next
- light repair
- full-governance audit boundary
- unsafe legacy fallback
- value heartbeat

These fixtures are meant to catch regressions where Threadsmith returns to
phase-name-only recommendations or protocol-heavy wording without capability
translation.

## Docs And Test Hygiene

The docs inventory found 41 plan documents. That means an index is useful soon,
but this slice intentionally records the need rather than reorganizing docs.

Mock-first verification is now called out as structural evidence. It proves
boundaries and writeback behavior, not live-provider quality or product feel.

## Non-Goals Preserved

- No frontend redesign.
- No multi-provider work.
- No release automation.
- No global skill sync.
- No Asterlea-specific rules in Threadsmith core.
- No broad smoke-test refactor.

## Verification Plan

Expected verification:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/orchestrator`
- `npm run verify:project-truth`
- `git diff --check`
