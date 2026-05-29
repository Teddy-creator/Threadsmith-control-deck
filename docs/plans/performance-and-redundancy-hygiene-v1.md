# Performance And Redundancy Hygiene v1 Implementation Plan

Goal: reduce Threadsmith's perceived slowness and structural redundancy without changing workflow behavior.

Scope: role packet construction, phase runner timing evidence, shared context reads, and small responsibility seams in orchestrator/fs-bridge code.

Non-goals: frontend changes, release work, global skill sync, multi-provider routing, prompt rewrites without tests, or parallel writes to committed truth.

Assumptions: reads and pure derivations can be parallelized safely; writes to committed truth, phase-run records, events, and history must remain ordered.

Verification: `npm run test --workspace @threadsmith/domain`, `npm run test --workspace @threadsmith/orchestrator`, `npm run test --workspace @threadsmith/fs-bridge`, `npm run verify:project-truth`, and `git diff --check`.

## Files

- Modify: `packages/domain/src/phaseRuns.ts`
- Modify: `packages/orchestrator/src/phaseRunner.ts`
- Modify: `packages/orchestrator/src/phaseRunner.test.ts`
- Modify: `packages/orchestrator/src/rolePackets.ts`
- Modify: `packages/orchestrator/src/phaseEvidence.ts`
- Create or modify tests near the changed orchestrator/fs-bridge seams as needed.

## Steps

1. Add a timing baseline to phase-run role runtime records so each role records packet build time, launch wait time, result apply time, result read time, and observed bridge overhead.
2. Use the timing baseline to identify duplicated reads in packet construction, especially repeated project state and latest run reads between role packet building and evidence bundle generation.
3. Introduce a shared role packet build context so independent reads can happen concurrently and repeated state/latest-run reads are reused.
4. Keep committed truth writes serial and preserve existing phase-run event ordering.
5. Clean up redundancy only where responsibility boundaries are clear; avoid generic utility modules or behavior-sensitive prompt rewrites.

## Risks

- Parallelizing writes could corrupt event order or produce confusing committed truth, so v1 only parallelizes reads and pure derivations.
- Timing fields can become noisy if they are treated as precise benchmarks; they are diagnostic hints, not acceptance criteria.
- Role packet prompt behavior is sensitive, so any prompt-adjacent cleanup needs tests or snapshots.

## Done When

- Phase-run role runtime artifacts expose enough timing detail to tell whether slowness comes from packet construction, CLI execution, result apply, or result readback.
- Tests prove the new runtime fields are recorded without changing the success path.
- A follow-up optimization slice can be selected from evidence rather than intuition.
