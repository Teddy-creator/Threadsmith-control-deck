# Phase History Candidate Review v1

## Purpose

Review the 36 Phase History candidates generated from `docs/plans/*.md` and
decide which ones are safe to backfill later.

This report does not write to `.threadsmith/history/phases.jsonl`. It only
classifies candidates so a later `--write` backfill can be small and auditable.

## Review Result

- Generated candidates: 36
- Written to history in this review: 0
- Recommended first selective backfill: release / milestone-level candidates
- Keep for later detailed review: implementation-slice candidates
- Skip from backfill: candidates already represented by current Phase History

## Recommended First Backfill Set

These are the best first candidates because they describe broad project
milestones with release tags, changelog entries, release checklists, or accepted
architecture closeout evidence.

| Candidate | Evidence | Recommendation |
| --- | --- | --- |
| `v0.2.0 Release Hardening` | `CHANGELOG.md`, `docs/checklists/release-v0.2.0.md`, tag `v0.2.0` | backfill as a milestone |
| `v0.2.x Windows Launcher Parity Implementation Plan` | `CHANGELOG.md`, `docs/checklists/release-v0.2.1.md`, tag `v0.2.1`, Windows compatibility commits | backfill as a milestone |
| `v0.3.0 Release-candidate Hardening` | `CHANGELOG.md`, `docs/checklists/release-v0.3.0.md`, tag `v0.3.0`, PR #21 / #22 / #23 evidence | backfill as a milestone |
| `Project State Store and Cross-Agent Bridge v1` | commits #28-#40, `docs/architecture/cross-agent-state-bridge-v1.md` | backfill as a major architecture phase |
| `Cross-Agent State Bridge v1 Consolidation & Gap Check` | plan status accepted, `docs/architecture/cross-agent-bridge-contract-closeout-v1.md`, commits #45 / #49 | backfill as a consolidation phase |
| `Threadsmith Full Governance Speedup v1` | commits `799d0ea`, `97e2594`, `bbfb06d`, `eaa1bf7` | backfill as a workflow-speed phase |
| `Threadsmith Role Chain Execution Cadence v1` | commit #54 / `3196496` | backfill as a workflow-cadence phase |
| `Threadsmith Phase Narrative Output v1` | commit #52 / `b875e06` | backfill as an output-clarity phase |
| `Threadsmith Operator Translation Layer v1` | commit #53 / `a60359b` | backfill as an output-clarity phase |

## Already Represented By Current Phase History

These should not be backfilled from generated candidates unless the current
history is intentionally rewritten. They already exist in
`.threadsmith/history/phases.jsonl` as committed project path entries.

| Candidate | Existing coverage | Recommendation |
| --- | --- | --- |
| `Threadsmith Phase History v1` | `phase-history-20260528-phase-history-v1` | skip |
| `Phase History Closeout Integration v1` | `phase-history-20260528-closeout-integration-v1` | skip |
| `Phase History Backfill Mechanism v1` | `phase-history-20260528-backfill-mechanism-v1` | skip |
| `Phase History Evidence-Based Candidate Generation v1` | `phase-history-20260528-candidate-generation-v1` | skip |

## Eligible But Too Granular For First Pass

These candidates look real, but they are smaller implementation slices. They are
better reviewed after the first milestone-level backfill, otherwise the project
path may become noisy.

| Candidate | Evidence | Recommendation |
| --- | --- | --- |
| `Bridge Refresh Command v1` | commit #46 / `70c9496` | defer to detailed bridge backfill |
| `External-Agent Fixture Pack v1` | commit #47 / `cb87f23` | defer to detailed bridge backfill |
| `Pending Proposal Visibility v1` | commit #48 / `4203091` | defer to detailed bridge backfill |
| `Proposal Review Workflow v1` | commit #41 / `375780c` | defer to detailed bridge backfill |
| `Proposal Adoption and Round-trip v1` | commit #50 / `d942655` plus Windows stabilization commits | defer to detailed bridge backfill |
| `Bridge Operator Workflow v1` | commit #51 / `d288c08` | defer to detailed bridge backfill |
| `Handoff Freshness Hardening v1` | commit #43 / `fa36267` | defer to detailed bridge backfill |
| `Stale Proposal Recovery v1` | commit #42 / `8168c14` | defer to detailed bridge backfill |
| `Context Packet Regeneration Engine v1` | commits `52ea9b1`, `18c76c5` | defer to detailed Context OS backfill |
| `v0.3.0 Autopilot Role Loop v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 Built-in Mini Protocols v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 Context Routing / Budget Tests v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `External Skill Adapter v1 Implementation Plan` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 First-run Onboarding / Copy Slimming / Demo Polish v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 Self-hosting-safe Skill Development v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 Skill Orchestrator Schema v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |
| `v0.3.0 Stop Rules / Recovery Hardening v1` | `CHANGELOG.md` v0.3.0 features | defer under v0.3.0 detailed backfill |

## Needs More Evidence Before Backfill

These should not be written yet. They need either a direct closeout artifact,
matching commit range, or a clearer accepted-state source.

| Candidate | Why not yet | Needed evidence |
| --- | --- | --- |
| `Canonical Workflow Repair v1 Implementation Plan` | The plan is important, but the exact accepted closeout boundary is not clear from this review. | direct commit range or accepted truth snapshot |
| `Drift Guardrails v1 Implementation Plan` | It is likely related to PR #25, but this review did not establish a clean phase boundary. | direct verification artifact or commit mapping |
| `Product Issue Migration / Canonical Recheck v1 Implementation Plan` | The plan may describe a recheck rather than a completed product phase. | accepted closeout or commit range |
| `v0.3.0 Truth Confidence / Recovery Experience v1` | It appears in planning material, but is not explicitly named in the release evidence reviewed here. | direct commits/tests or release mapping |

## Suggested Backfill Policy

1. First backfill only the recommended milestone-level set.
2. Keep implementation-slice candidates out of the first write so the history
   reads like a project path, not a commit log.
3. Never write candidates classified as "needs more evidence" until their
   evidence is made explicit.
4. Keep the generated candidates JSON as a review artifact, not as authority.

## Next Safe Step

Generate a small JSON file containing only the recommended first backfill set,
run:

```bash
npm run threadsmith:phase-history:backfill -- /Users/cloud/Code/threadsmith-control-deck <recommended-candidates.json>
```

Then inspect the dry-run output. Only after operator approval should the same
file be used with `--write`.
