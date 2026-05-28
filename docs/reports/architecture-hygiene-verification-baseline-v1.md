# Architecture Hygiene Verification Baseline v1

## Purpose

This report defines which verification commands should be run for different
Threadsmith change types.

The goal is to make cleanup work safer and faster: choose the smallest useful
verification set for the change, then run the broader set before PR.

This report documents the current repo reality. It does not add fake build
scripts to packages that do not have them.

## Current Package Scripts

| Workspace | Test command | Build command | Notes |
| --- | --- | --- | --- |
| `@threadsmith/domain` | `npm run test --workspace @threadsmith/domain` | none | Schemas and shared contracts only. |
| `@threadsmith/runtime` | `npm run test --workspace @threadsmith/runtime` | none | Pure runtime selectors and decision logic. |
| `@threadsmith/fs-bridge` | `npm run test --workspace @threadsmith/fs-bridge` | none | Filesystem truth read/write behavior. |
| `@threadsmith/orchestrator` | `npm run test --workspace @threadsmith/orchestrator` | none | Execution packets, phase runner, Codex CLI bridge. |
| `@threadsmith/control-deck` | `npm run test --workspace @threadsmith/control-deck` | `npm run build --workspace @threadsmith/control-deck` | Frontend is frozen unless explicitly approved. |

Root commands:

| Command | Meaning |
| --- | --- |
| `npm run test` | Runs all workspace tests. |
| `npm run build` | Runs workspace builds where present. Currently this mainly covers the control deck app. |
| `npm run test:e2e` | Runs all Playwright smoke e2e tests. |
| `npm run verify:launchers` | Validates macOS and Windows launchers from the current platform where possible. |
| `npm run verify:launchers:windows` | Validates PowerShell launchers. Useful for Windows parity work. |
| `npm run verify:project-truth` | Validates committed `.threadsmith` truth schemas. |
| `npm run verify:skill-sync` | Checks repo/global skill sync expectations. Do not use as implicit permission to sync global skill. |
| `npm run verify:skill-contract` | Validates Threadsmith skill contract expectations. |

## Verification Matrix by Change Type

| Change type | Minimum useful verification | Add before PR |
| --- | --- | --- |
| Domain schema or type contract | `npm run test --workspace @threadsmith/domain` | `npm run test --workspace @threadsmith/runtime`; `npm run test --workspace @threadsmith/fs-bridge`; `npm run verify:project-truth`; `git diff --check` |
| Runtime decision logic | `npm run test --workspace @threadsmith/runtime` | `npm run test --workspace @threadsmith/control-deck` if UI-derived models could change; `npm run verify:project-truth`; `git diff --check` |
| Filesystem truth or `.threadsmith` writeback | `npm run test --workspace @threadsmith/fs-bridge`; `npm run verify:project-truth` | Targeted script smoke if the change affects a script; `npm run test --workspace @threadsmith/orchestrator` if run/phase behavior changes; `git diff --check` |
| Orchestrator, role packets, Codex CLI bridge | `npm run test --workspace @threadsmith/orchestrator` | `npm run test --workspace @threadsmith/runtime`; `npm run test:e2e:bridge` or `npm run test:e2e:autopilot` when bridge/autopilot paths are affected; `git diff --check` |
| Script-only cleanup | Run the touched script(s) with realistic dry-run arguments | Relevant package tests for the package the script delegates to; `npm run verify:project-truth`; `git diff --check` |
| Launcher or app-start surface | `npm run verify:launchers:macos` or `npm run verify:launchers:windows` | `npm run verify:launchers`; targeted start/smoke command if changed; `git diff --check` |
| Control deck frontend | `npm run test --workspace @threadsmith/control-deck`; `npm run build --workspace @threadsmith/control-deck` | `npm run test:e2e`; browser/manual visual check if layout changed; `git diff --check` |
| Skill source or skill contract | `npm run verify:skill-contract` | `npm run verify:skill-sync` only when intentionally checking repo/global divergence; `npm run verify:project-truth`; `git diff --check` |
| Docs-only architecture/report change | `npm run verify:project-truth`; `git diff --check` | Package tests are optional unless docs describe executable behavior that was also changed. |

## Current Architecture Hygiene Verification Sets

### Slice 1: Architecture Inventory

Run:

```bash
npm run verify:project-truth
git diff --check
```

Reason:

- report-only change;
- no code path changed.

### Slice 2: CLI Helper Consolidation

Run:

```bash
npm run threadsmith:phase-history:candidates -- . --output /tmp/threadsmith-phase-history-candidates.json
npm run threadsmith:phase-history:backfill -- . /tmp/threadsmith-phase-history-candidates.json
npm run threadsmith:proposal-status -- .
npm run test --workspace @threadsmith/fs-bridge
npm run verify:project-truth
git diff --check
```

Reason:

- changed script entry points;
- scripts delegate to `@threadsmith/fs-bridge`;
- no frontend behavior should change.

### Slice 3: Verification Baseline

Run:

```bash
npm run verify:project-truth
git diff --check
```

Reason:

- report-only change;
- no package code changed in this slice.

## Full PR Gate

Before opening or merging an architecture hygiene PR, prefer:

```bash
npm run test --workspace @threadsmith/domain
npm run test --workspace @threadsmith/runtime
npm run test --workspace @threadsmith/fs-bridge
npm run test --workspace @threadsmith/orchestrator
npm run verify:project-truth
git diff --check
```

If frontend or app server files are touched, add:

```bash
npm run test --workspace @threadsmith/control-deck
npm run build --workspace @threadsmith/control-deck
npm run test:e2e
```

If launchers are touched, add:

```bash
npm run verify:launchers
```

If the PR is intended to match CI exactly, run:

```bash
npm run test
npm run build
npm run verify:launchers
npm run test:e2e
```

## Stop Conditions

Stop and reassess if:

- a cleanup changes product behavior;
- the verification set needs frontend e2e even though the slice was supposed to
  avoid frontend files;
- a package starts requiring a build command that does not exist;
- script output changes unintentionally;
- project truth validation fails after a docs or helper-only change.
