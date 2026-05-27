# Phase History Backfill Mechanism v1

## Goal

Add a safe mechanism for backfilling older phase history entries without
guessing or silently mutating committed truth.

## Scope

- Add a backfill API that validates candidate Phase History entries.
- Detect duplicates by entry id, source reference, and completed phase.
- Default to dry-run so operators can preview what would be appended.
- Add an explicit CLI write mode for approved backfills.
- Keep this slice backend/tooling only; do not change the frontend.

## Out of scope

- Automatically discovering all historical phases.
- Automatically writing guessed historical entries.
- Rendering Phase History in the deck UI.
- Publishing a release or syncing the global installed skill.

## Done when

- Backfill candidates are schema-validated before any write.
- Dry-run reports accepted and skipped candidates without changing history.
- Write mode appends only non-duplicate candidates.
- Tests cover dry-run, write mode, and duplicate detection.

## Verification

- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/fs-bridge`
- `npm run verify:project-truth`
- `git diff --check`
