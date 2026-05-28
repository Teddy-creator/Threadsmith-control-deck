# Architecture Hygiene v1

## Goal

Keep Threadsmith from drifting into a hard-to-maintain codebase while preserving
the current product behavior and avoiding a broad rewrite.

This is a structure-health pass, not a feature release.

## Current Diagnosis

The repository is not a "big ball of mud" yet. It still has a workable package
boundary:

- `packages/domain`: schemas and pure domain contracts;
- `packages/runtime`: workflow decisions and runtime logic;
- `packages/fs-bridge`: filesystem truth reads/writes and project adapters;
- `packages/orchestrator`: role execution and autopilot coordination;
- `apps/control-deck`: local web surface;
- `scripts`: operator-facing CLI entry points and smoke tools.

The risk is that several files are becoming gravity wells:

- `packages/fs-bridge/src/workflow.ts`
- `packages/fs-bridge/src/fileStore.ts`
- `apps/control-deck/src/DeckScreen.tsx`
- `packages/orchestrator/src/rolePackets.ts`
- `packages/runtime/src/nextBestStep.ts`
- `packages/runtime/src/commandBridge.ts`
- `scripts/threadsmith-*.ts`

The right move is incremental hygiene, not a repo-wide rewrite.

## Scope

### Slice 1: Architecture Inventory

- Produce a current code map for high-risk modules.
- Classify each large file as acceptable, split-later, or split-now.
- Identify stable seams and risky seams.
- No code movement in this slice.

### Slice 2: CLI Helper Consolidation

- Extract shared CLI helpers for argument parsing, project root resolution,
  JSON/text output, and consistent error handling.
- Apply only to a small representative set of `scripts/threadsmith-*` commands.
- Avoid changing command behavior.

### Slice 3: Verification Script Baseline

- Add or document package-level verification expectations.
- Avoid pretending a package has a `build` script when it does not.
- Make root verification commands easier to reason about.

### Slice 4: Truth / Artifact Hygiene Rules

- Clarify what belongs in committed truth, docs artifacts, runtime artifacts,
  and local-only outputs.
- Add or update guardrails where lightweight.
- Keep `.threadsmith` review rules explicit.

### Slice 5: Frontend Risk Register Only

- Keep frontend frozen unless explicitly approved.
- Document frontend structural risks such as `DeckScreen.tsx` size and test
  fixture bulk.
- Do not refactor UI in this hygiene pass by default.

## Out of Scope

- Rewriting app architecture.
- Changing frontend layout or styling.
- Publishing a release.
- Syncing global `$threadsmith`.
- Changing public product behavior.
- Large file splitting for its own sake.
- Multi-provider feature work.

## Done When

- There is a reviewed architecture hygiene inventory.
- At least one small CLI/helper consolidation slice proves the cleanup approach.
- Verification expectations are documented or lightly encoded.
- Truth/artifact hygiene rules are easier to follow.
- No user-facing behavior regresses.

## Verification

Use the smallest verification set that covers each slice, then run broader
checks before PR:

```bash
npm run test --workspace @threadsmith/domain
npm run test --workspace @threadsmith/runtime
npm run test --workspace @threadsmith/fs-bridge
npm run test --workspace @threadsmith/orchestrator
npm run verify:project-truth
git diff --check
```

If frontend files are touched later, add:

```bash
npm run test --workspace @threadsmith/control-deck
npm run build --workspace @threadsmith/control-deck
```

## Stop Conditions

- A proposed cleanup changes product behavior.
- A refactor needs broad frontend changes.
- A split creates more tiny files without reducing cognitive load.
- Verification cannot distinguish behavior-preserving cleanup from functional
  change.

## Next First Slice

Start with `Architecture Hygiene Inventory v1`.

The output should be a report, not code movement:

- current high-risk modules;
- why each one is risky or acceptable;
- recommended first refactor target;
- verification needed for that target;
- explicit "do not touch yet" list.
