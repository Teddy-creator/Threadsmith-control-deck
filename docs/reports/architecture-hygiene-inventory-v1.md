# Architecture Hygiene Inventory v1

## Purpose

This report turns the architecture hygiene track into an executable cleanup
sequence.

The current goal is not to rewrite Threadsmith. The goal is to keep the
codebase understandable while preserving the current behavior of the skill,
filesystem truth, orchestration runtime, and local web surface.

Frontend implementation remains frozen for this pass. Frontend risks are
recorded only as future work.

## Current Architecture Map

| Area | Current responsibility | Health judgment |
| --- | --- | --- |
| `packages/domain` | Shared schemas, project truth contracts, run records, routing contracts. | Healthy. It is still mostly declarative and low-risk. |
| `packages/runtime` | Pure decision logic, supervisor derivations, next-step selection, context packet builders. | Mostly healthy, but decision files are growing branch-heavy. |
| `packages/fs-bridge` | Reads and writes `.threadsmith`, committed truth, run artifacts, events, phase history. | Useful boundary, but `workflow.ts` and `fileStore.ts` are becoming gravity wells. |
| `packages/orchestrator` | Role packet construction, Codex CLI execution, phase runner, stop rules, deck action bridge. | Functional but prompt/packet generation is dense and should be modularized later. |
| `scripts` | Operator CLI entry points and smoke tools. | Good first cleanup target because duplication is visible and behavior is easy to verify. |
| `apps/control-deck` | Local web monitoring and configuration surface. | Frozen. Do not refactor in this pass unless explicitly approved. |
| `codex/skills/threadsmith` | Repo copy of the Threadsmith skill source. | Needs careful sync discipline, but not the first architecture cleanup target. |

## Large File Inventory

| File | Size | Risk | Recommendation |
| --- | ---: | --- | --- |
| `packages/fs-bridge/src/workflow.ts` | 1163 lines | High. It combines workflow transitions, run result writeback, context packet refresh, handoff writing, closeout artifact writing, and phase history append behavior. | Split later, after CLI helper cleanup proves the hygiene approach. First candidate splits: run writeback, phase history integration, closeout artifact integration. |
| `packages/fs-bridge/src/fileStore.ts` | 967 lines | Medium. It is large but still a recognizable filesystem truth store. Splitting too early could scatter core read/write semantics. | Keep for now. Add boundary notes later if it continues growing. |
| `apps/control-deck/src/DeckScreen.tsx` | 1049 lines | Medium-high, but frozen. It concentrates shell layout, drawer behavior, action previews, and inspector wiring. | Do not touch in this pass. Record as frontend risk only. |
| `packages/orchestrator/src/rolePackets.ts` | 791 lines | Medium-high. It mixes context reference selection, role-specific packet content, mini-protocol routing, and output instructions. | Split later by packet sections or role-specific builders. Not first. |
| `packages/runtime/src/nextBestStep.ts` | 689 lines | Medium-high. Branch-heavy decision selector; future patches may become hard to reason about. | Split later into accepted/running/failed/recovery decision modules after tests are mapped. |
| `packages/runtime/src/commandBridge.ts` | 663 lines | Medium. It summarizes bridge state for UI/runtime. Behavior is covered by tests and should not be split before `nextBestStep.ts`. | Leave for now unless new bridge states are added. |
| `apps/control-deck/vite.config.ts` | 676 lines | Medium. It contains dev API handlers and app server glue. | Frozen with frontend. Consider server route extraction in a later frontend/backend surface pass. |

## Script Inventory

Threadsmith currently has several `scripts/threadsmith-*.ts` entry points. The
short scripts repeat the same small patterns:

- resolve project root from positional args;
- parse flags such as `--write` or `--output`;
- print JSON with consistent formatting;
- print a named error header plus project root;
- exit with status `1` on failure.

Representative scripts:

| Script | Size | Cleanup fit |
| --- | ---: | --- |
| `scripts/threadsmith-phase-history-candidates.ts` | 50 lines | Good first target. Has positional project root, `--output`, JSON output, error formatting. |
| `scripts/threadsmith-phase-history-backfill.ts` | 60 lines | Good first target. Has `--write`, positional args, JSON output, usage error. |
| `scripts/threadsmith-proposal-status.ts` | 17 lines | Good small target after helper shape is proven. |
| `scripts/threadsmith-autopilot-smoke.ts` | 502 lines | Do not touch first. It is large but likely contains scenario-specific smoke logic. |
| `scripts/threadsmith-autopilot.ts` | 157 lines | Later target after helper API is stable. |
| Proposal smoke scripts | 111-153 lines each | Later target. Use only after helper has tests or clear local verification. |

## Stable Seams

These seams are worth preserving:

- `domain` owns schemas and portable contracts.
- `runtime` owns pure decisions and derived state.
- `fs-bridge` owns `.threadsmith` persistence and committed truth writeback.
- `orchestrator` owns execution, role packets, provider execution, and phase runner behavior.
- `scripts` should stay thin and delegate to package functions.
- `apps/control-deck` consumes runtime/fs-bridge output but should not become the source of truth.

## Risky Seams

These seams need protection during cleanup:

- Do not move schema definitions out of `domain` just to reduce imports.
- Do not let scripts duplicate business rules that already live in packages.
- Do not let `fs-bridge` depend on app code.
- Do not let `runtime` start reading files directly.
- Do not refactor UI layout while doing backend/skill hygiene.
- Do not sync global `$threadsmith` as part of repo hygiene.

## Low-Risk Quick Fixes

These are safe candidates if they remain isolated:

1. Remove duplicate export of `projectCharterGate.ts` from `packages/orchestrator/src/index.ts`.
2. Add a shared script helper for JSON printing and error exits.
3. Move repeated project-root/flag parsing out of the smallest scripts.

These are intentionally small. They should not expand into workflow refactors.

## Recommended Execution Order

### Slice 1: CLI Helper Consolidation

Create a small script helper module and migrate only representative scripts.

Candidate file:

- `scripts/lib/threadsmithScript.ts`

Candidate helpers:

- `resolveProjectRootArg(args, fallbackCwd)`
- `readFlagValue(args, flag)`
- `hasFlag(args, flag)`
- `printJson(value)`
- `failWithThreadsmithError(title, projectRoot, error)`

Initial migration targets:

- `scripts/threadsmith-phase-history-candidates.ts`
- `scripts/threadsmith-phase-history-backfill.ts`
- `scripts/threadsmith-proposal-status.ts`

Verification:

```bash
npm run threadsmith:phase-history:candidates -- . --output /tmp/threadsmith-phase-history-candidates.json
npm run threadsmith:phase-history:backfill -- . /tmp/threadsmith-phase-history-candidates.json
npm run threadsmith:proposal:status -- .
npm run verify:project-truth
git diff --check
```

### Slice 2: Package Verification Baseline

Document which commands validate each package and which package lacks build
scripts by design.

Target:

- update `docs/plans/architecture-hygiene-v1.md` or create a focused report in
  `docs/reports/`.

Verification:

```bash
npm run test --workspace @threadsmith/domain
npm run test --workspace @threadsmith/runtime
npm run test --workspace @threadsmith/fs-bridge
npm run test --workspace @threadsmith/orchestrator
npm run verify:project-truth
git diff --check
```

### Slice 3: Truth / Artifact Hygiene Rules

Clarify where each output belongs:

- committed truth: `.threadsmith/*.json`, `.threadsmith/history/*.jsonl`;
- runtime artifacts: `.threadsmith/runs`, `.threadsmith/phase-runs`;
- operator docs/reports: `docs/reports`, `docs/reports/artifacts`;
- local scratch output: `/tmp` or ignored local paths.

Verification:

```bash
npm run verify:project-truth
git diff --check
```

### Slice 4: Workflow Split Plan, No Split Yet

Before touching `workflow.ts`, write a small split plan with exact function
groups and tests. The first likely split is run result writeback because it has
clear inputs and observable outcomes.

Potential future files:

- `packages/fs-bridge/src/workflowRunWriteback.ts`
- `packages/fs-bridge/src/workflowPhaseHistory.ts`
- `packages/fs-bridge/src/workflowCloseout.ts`

Stop condition:

- If the split requires changing public behavior or broad tests fail for unclear
  reasons, stop and keep `workflow.ts` intact.

## Do Not Touch Yet

- Frontend layout, styling, cards, drawers, or homepage content.
- `DeckScreen.tsx`, unless a future frontend-specific refactor is explicitly
  approved.
- `apps/control-deck/vite.config.ts`, unless a dev server bug blocks tests.
- Global `/Users/cloud/.codex/skills/threadsmith/SKILL.md`.
- Release docs or version numbers.
- Multi-provider behavior.
- Large prompt rewrites in `rolePackets.ts`.

## Done When

This inventory is accepted when:

- it identifies real structural risks without calling for a broad rewrite;
- it gives a first cleanup slice that can be implemented and verified quickly;
- it preserves the frontend freeze;
- it names explicit stop conditions;
- it gives enough detail for another Codex session to execute Slice 1 without
  rediscovering the codebase.
