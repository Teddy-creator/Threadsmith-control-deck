# Phase History Closeout Integration v1

## Goal

Connect accepted workflow closeout to Phase History so completed phases are
recorded automatically instead of relying on a separate manual truth writeback.

## Scope

- Build a Phase History entry from the accepted closeout state.
- Append the entry when `closeout-complete` succeeds.
- Keep the entry source linked to the generated closeout artifact.
- Add regression coverage to prove the workflow loop writes one history entry.
- Keep this slice backend/file-contract only; do not change the frontend.

## Out of scope

- Rendering Phase History in the deck UI.
- Backfilling older phases.
- Changing phase-run runtime records.
- Adding multi-agent scheduling or external provider behavior.
- Publishing a release or syncing the global installed skill.

## Done when

- `closeout-complete` writes the closeout artifact and appends a matching
  `.threadsmith/history/phases.jsonl` entry.
- The entry records phase name, result, deliverables, verification, next phase,
  and closeout artifact source.
- Workflow tests cover the automatic history append.
- Project truth remains schema-valid.

## Verification

- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/fs-bridge`
- `npm run verify:project-truth`
- `git diff --check`
