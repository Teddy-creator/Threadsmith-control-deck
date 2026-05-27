# Phase History Branch Review / PR Preparation v1

## Branch

- Branch: `threadsmith-phase-history-v1`
- Base: `main` at `48d210b Enforce Threadsmith closeout output gate`
- Commits reviewed: 9

## Scope Summary

This branch adds Threadsmith Phase History as a committed project path ledger.
It includes:

- phase history domain schema;
- append/read/latest/summary helpers;
- closeout integration;
- safe candidate generation and backfill tooling;
- reviewed milestone-level historical backfill;
- CLI summary command;
- operator documentation and truth-boundary updates.

Frontend remains frozen. No `apps/` files are changed in this branch.

## Commit Range

```text
086580b Add Threadsmith phase history store
e99e86a Connect closeout to phase history
291686d Add phase history backfill mechanism
b6c433c Generate phase history candidates from plans
efd3c89 Review phase history backfill candidates
f3d51ff Dry run recommended phase history backfill
e20ce97 Backfill recommended phase history milestones
15dd16f Add phase history summary command
97fb2c3 Document phase history operator contract
```

## Files Changed By Category

### Product code

- `packages/domain/src/phaseHistory.ts`
- `packages/domain/src/index.ts`
- `packages/fs-bridge/src/phaseHistory.ts`
- `packages/fs-bridge/src/phaseHistoryCandidates.ts`
- `packages/fs-bridge/src/workflow.ts`
- `packages/fs-bridge/src/paths.ts`
- `packages/fs-bridge/src/fileStore.ts`
- `packages/fs-bridge/src/index.ts`
- `scripts/threadsmith-phase-history-candidates.ts`
- `scripts/threadsmith-phase-history-backfill.ts`
- `scripts/threadsmith-phase-history-summary.ts`
- `package.json`

### Tests

- `packages/domain/src/phaseHistory.test.ts`
- `packages/fs-bridge/src/phaseHistory.test.ts`
- `packages/fs-bridge/src/phaseHistoryCandidates.test.ts`
- `packages/fs-bridge/src/workflow.test.ts`

### Truth / history

- `.threadsmith/history/phases.jsonl`
- `.threadsmith/*.json`

### Docs / artifacts

- `docs/plans/threadsmith-phase-history-v1.md`
- `docs/plans/threadsmith-phase-history-closeout-integration-v1.md`
- `docs/plans/threadsmith-phase-history-backfill-mechanism-v1.md`
- `docs/plans/threadsmith-phase-history-candidate-generation-v1.md`
- `docs/reports/phase-history-candidate-review-v1.md`
- `docs/reports/artifacts/recommended-phase-history-*.json`
- `docs/guides/phase-history-operator-guide.md`
- `docs/architecture/threadsmith-truth-boundary.md`
- `README.md`

## Verification Evidence

```bash
npm run test --workspace @threadsmith/domain
npm run test --workspace @threadsmith/fs-bridge
npm run threadsmith:phase-history:summary -- /Users/cloud/Code/threadsmith-control-deck --limit 5
npm run threadsmith:phase-history:backfill -- /Users/cloud/Code/threadsmith-control-deck docs/reports/artifacts/recommended-phase-history-candidates-v1.json
npm run verify:project-truth
git diff --check
```

Observed results:

- Domain tests: 15 files, 54 tests passed.
- fs-bridge tests: 20 files, 82 tests passed.
- Summary command reported 18 total phase entries and latest phase
  `Phase History Contract Docs / Operator Guidance v1`.
- Backfill dry-run reported `existingCount: 18`, `acceptedCount: 0`,
  `skippedCount: 9`; all recommended candidates are now duplicate-protected.
- Project truth is schema-valid.
- Diff hygiene passed.

## PR Readiness

Ready for PR review.

Recommended PR title:

```text
Add Threadsmith phase history ledger
```

Recommended PR summary:

- Adds append-only Phase History as a committed project path ledger.
- Connects accepted closeout to history entries.
- Adds safe candidate generation, dry-run/write backfill, and duplicate checks.
- Backfills 9 reviewed milestone-level historical phases.
- Adds a read-only summary command and operator docs.

## Known Boundaries

- This does not change the frontend.
- This does not publish a release.
- This does not sync the global installed `$threadsmith` skill.
- Backfilled history covers only 9 reviewed milestone-level phases, not every
  old implementation slice.
- Phase History is a path ledger, not a full audit log or proof that current
  code still passes all historical tests.
