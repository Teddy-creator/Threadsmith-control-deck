# Phase History Evidence-Based Candidate Generation v1

## Goal

Generate reviewable old-phase history candidates from repo evidence, then run
them through the existing dry-run backfill guard without writing history.

## Scope

- Scan `docs/plans/*.md` as the first conservative evidence source.
- Extract phase name, summary, deliverables, verification, and evidence refs.
- Produce candidate Phase History entries with medium confidence.
- Preview candidates through `backfillPhaseHistory` dry-run.
- Add a CLI that can optionally write candidate JSON for later review.

## Out of scope

- Writing candidates into `.threadsmith/history/phases.jsonl`.
- Inferring acceptance from chat memory or unverified model judgment.
- Parsing every possible evidence source such as commits, PRs, release notes,
  and closeout artifacts.
- Frontend timeline or UI display.
- Publishing a release or syncing the global installed skill.

## Done when

- Candidate generation works from plan documents.
- Existing Phase History entries are used to report skipped duplicates.
- A CLI can print dry-run summary and optionally write candidate JSON.
- Tests cover generation, duplicate preview, and output file writing.

## Verification

- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/fs-bridge`
- `npm run threadsmith:phase-history:candidates -- /Users/cloud/Code/threadsmith-control-deck`
- `npm run verify:project-truth`
- `git diff --check`
