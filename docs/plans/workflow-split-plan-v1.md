# Workflow Split Plan v1

Goal: Reduce `packages/fs-bridge/src/workflow.ts` cognitive load without changing
Threadsmith workflow behavior.

Scope: Plan the first safe extraction seam from `workflow.ts`, including exact
function groups, target files, test coverage, and stop conditions.

Non-goals:

- Do not refactor frontend files.
- Do not change workflow behavior.
- Do not split `workflow.ts` just to reduce line count.
- Do not rewrite the state machine.
- Do not sync global `$threadsmith`.
- Do not publish a release.

Assumptions:

- `workflow.ts` remains the public module exporting `applyDeckActionState`,
  `applyWorkflowTransition`, and `applyAgentRunResult`.
- Initial cleanup should prefer low-dependency extractions over large state
  machine rewrites.
- Tests should prove behavior preservation before and after each extraction.

Verification:

```bash
npm run test --workspace @threadsmith/fs-bridge -- workflow.test.ts phaseHistory.test.ts commandBridge.test.ts
npm run test --workspace @threadsmith/fs-bridge
npm run verify:project-truth
git diff --check
```

## Current Responsibility Map

`workflow.ts` currently contains these groups:

| Lines | Responsibility | Notes |
| --- | --- | --- |
| `44-141` | Shared workflow helpers | Role ordering, active-work merging, workflow gap cleanup, checklist marking, role guard. |
| `143-199` | Agent run result formatting helpers | Provider labels, failure summaries, artifact path picking. |
| `200-277` | Closeout phase history helpers | Builds and appends phase history entries from accepted closeout truth. |
| `279-296` | Artifact/context helpers | Artifact-only run guard and optional context artifact reads. |
| `298-515` | Deck action state application | Handles `advance-phase`, `run-verification`, `sync-context`, `run-hygiene`, `create-handoff`. |
| `517-823` | Manual workflow transitions | Handles executor/reviewer/verifier/closeout transitions, evidence artifacts, closeout artifact, auto handoff. |
| `825-1163` | Agent run result writeback | Converts planner/executor/reviewer/verifier/closeout run results into workflow truth and events. |

## Extraction Candidates

### Candidate A: Closeout Phase History

Target file:

- `packages/fs-bridge/src/workflowPhaseHistory.ts`

Move:

- `offsetIsoTimestamp` only if later needed by closeout/handoff helper; otherwise keep in `workflow.ts`.
- `slugPhaseHistoryId`
- `summarizePhaseHistoryResult`
- `buildPhaseHistoryEntry`
- `appendCloseoutPhaseHistory`

Why first:

- Small and cohesive.
- Only depends on `ProjectState`, `PhaseHistoryEntry`, `readPhaseHistory`, and
  `appendPhaseHistoryEntry`.
- Already has coverage through `workflow.test.ts` closeout path and
  `phaseHistory.test.ts`.
- Reduces one concrete responsibility from `workflow.ts` without touching the
  state-machine branches.

Risks:

- Accidentally changing duplicate detection semantics for closeout history.
- Accidentally changing generated phase history IDs.

Required tests:

```bash
npm run test --workspace @threadsmith/fs-bridge -- workflow.test.ts phaseHistory.test.ts
```

Stop condition:

- If closeout history output changes unexpectedly, revert this extraction and
  add a focused test before retrying.

### Candidate B: Agent Run Formatting Helpers

Target file:

- `packages/fs-bridge/src/workflowRunResultFormat.ts`

Move:

- `providerLabel`
- `automationFailureGap`
- `isReportingFailureAfterSuccessfulTask`
- `executorFailureTaskSummary`
- `failedRunEventTitle`
- `failedRunEventDetail`
- `runArtifactPath`
- `isArtifactOnlyRun`

Why second:

- These helpers are cohesive and support `applyAgentRunResult`.
- They do not write files directly.
- They can be tested through existing workflow and command bridge tests.

Risks:

- Over-extracting tiny helpers before the first split proves stable.
- Changing event title/detail wording and breaking UI/e2e expectations.

Required tests:

```bash
npm run test --workspace @threadsmith/fs-bridge -- workflow.test.ts commandBridge.test.ts
```

Stop condition:

- If event wording changes, stop and either revert or add explicit tests for the
  event text before continuing.

### Candidate C: Context Sync Helper

Target file:

- `packages/fs-bridge/src/workflowContextSync.ts`

Move:

- `readOptionalContextArtifact`
- context packet regeneration logic from `applyDeckActionState("sync-context")`

Why later:

- It pulls in `buildContextPacket`, repo map, evidence summary, and context file
  constants.
- It is a clean seam but more behavior-adjacent than Candidate A.

Required tests:

```bash
npm run test --workspace @threadsmith/fs-bridge -- workflow.test.ts
```

Stop condition:

- If current packet contents or event artifact path changes unexpectedly, stop.

### Candidate D: Full Agent Run Writeback

Target file:

- `packages/fs-bridge/src/workflowRunWriteback.ts`

Move:

- Most of `applyAgentRunResult`
- Result-role specific branch builders

Why not first:

- This is the most valuable long-term split, but it has the highest behavior
  risk.
- It currently calls `applyWorkflowTransition` for reviewer/verifier/closeout
  shortcut branches. Moving it too early can create circular dependencies or a
  bigger abstraction than needed.

Prerequisite:

- Complete Candidate A and B first.
- Add or preserve tests for planner, executor, reviewer, verifier, closeout,
  artifact-only, and failed executor run paths.

Required tests:

```bash
npm run test --workspace @threadsmith/fs-bridge -- workflow.test.ts commandBridge.test.ts
npm run test --workspace @threadsmith/fs-bridge
```

Stop condition:

- If extraction requires changing `applyWorkflowTransition` behavior, stop and
  write a narrower plan first.

## Recommended First Implementation Slice

Implement Candidate A only.

Files:

- Create: `packages/fs-bridge/src/workflowPhaseHistory.ts`
- Modify: `packages/fs-bridge/src/workflow.ts`
- Tests: existing `packages/fs-bridge/src/workflow.test.ts`
- Tests: existing `packages/fs-bridge/src/phaseHistory.test.ts`

Steps:

1. Create `workflowPhaseHistory.ts` with `appendCloseoutPhaseHistory`.
2. Move the phase-history-only helper functions into that file.
3. Import `appendCloseoutPhaseHistory` from `workflow.ts`.
4. Keep public exports unchanged unless a later consumer needs the helper.
5. Run targeted tests.
6. Run full `@threadsmith/fs-bridge` tests.
7. Run `npm run verify:project-truth` and `git diff --check`.

Expected outcome:

- `workflow.ts` loses the closeout phase history responsibility.
- No state transition behavior changes.
- No public API changes.
- Future run writeback extraction becomes easier to reason about.

## Do Not Touch Yet

- `applyWorkflowTransition` switch branches, except for replacing the local
  helper call with an imported helper.
- `applyAgentRunResult` branch behavior.
- Event text.
- Artifact path formats.
- Frontend files.
- `packages/fs-bridge/src/index.ts`, unless the helper intentionally becomes
  public later.

## Done When

- Candidate A has a clean implementation plan.
- Tests that protect closeout phase history are named.
- Stop conditions are explicit.
- The next implementation slice is small enough to execute without rediscovering
  `workflow.ts`.
