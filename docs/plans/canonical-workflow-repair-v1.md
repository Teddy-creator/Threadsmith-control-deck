# Canonical Workflow Repair v1 Implementation Plan

Goal: Re-anchor Threadsmith development on `threadsmith-control-deck` as the canonical source, then prepare the skill-first Project Charter Gate / AGENTS.md workflow upgrade.

Scope:

- Sync the installed 2026-05-22 Threadsmith output contract back into `threadsmith-control-deck`.
- Reset `.threadsmith/` truth from stale `v0.3.2 patch release` closeout to this repair phase.
- Convert `THREADSMITH_AGENTS_WORKFLOW_PROPOSAL.md` into an executable repo-local skill plan.
- Define how previously discovered product issues will be rechecked in `threadsmith-control-deck`.

Non-goals:

- Installing or overwriting `~/.codex/skills/threadsmith`.
- Copying fixes directly from the divergent historical `Threadsmith` repository.
- Publishing a release.
- Implementing multi-provider automation.
- Automatically invoking external skills.
- Reworking the Control Deck UI.

Assumptions:

- `threadsmith-control-deck` is the canonical source.
- `~/.codex/skills/threadsmith` is an installed copy, not the development source.
- The historical `Threadsmith` repository may contain useful diagnostics, but every claim must be revalidated here.
- The next phase should prioritize skill protocol quality over frontend changes.

## Files

- Modify: `.threadsmith/current-phase.json`
- Modify: `.threadsmith/acceptance-state.json`
- Modify: `.threadsmith/project-brief.json`
- Modify: `.threadsmith/project-status.json`
- Modify: `.threadsmith/active-work.json`
- Modify: `.threadsmith/project-supervision.json`
- Modify: `.threadsmith/project-roadmap.json`
- Modify: `codex/skills/threadsmith/SKILL.md`
- Create: `docs/plans/canonical-workflow-repair-v1.md`

## Source Of Truth Decision

`threadsmith-control-deck` is the canonical source.

The installed global skill is only an installed copy. Local installed-skill improvements may be audited and merged back into the canonical repo, but future changes should originate in the repo before installation.

The historical `Threadsmith` repository is not the current source for Threadsmith skill or runtime behavior.

## Output Contract Sync

The installed global skill added a clearer response shape on 2026-05-22. This phase syncs that shape into the repo skill:

- `last completed step`
- `上一步做了什么`
- `下一步具体要做什么`
- `需要确认的点`

The purpose is to reduce repeated suggestions and make the previous step, next step, success criteria, and stop condition explicit in every Threadsmith response.

## Project Charter Gate Contract

The source proposal is:

```text
/Users/cloud/Documents/Codex/2026-05-06/ai-agi/THREADSMITH_AGENTS_WORKFLOW_PROPOSAL.md
```

The implementation should preserve this division of responsibility:

- `AGENTS.md`: durable project constitution.
- `.threadsmith/`: current execution truth.
- `agents-md-builder`: guided AGENTS.md creation/update path.
- `threadsmith`: phase-bound supervisor that reads and enforces project constitution before normal execution.

### Gate Result Levels

Project Charter Gate should not be only binary.

- `pass`: enough durable guidance exists for normal Threadsmith work.
- `warn`: read-only or low-risk work may continue, but missing guidance is reported.
- `fail`: implementation, bootstrap, or continuous execution stops and routes to `agents-md-builder`.
- `bypassed`: user explicitly chose to skip or defer project constitution setup; residual risk is recorded.

### Mode Behavior

- `sync`: may continue in read-only mode even when the gate is `warn` or `fail`, but must report charter status.
- `drive`: must stop on `fail` unless a safe explicit bypass applies.
- `continuous`: must stop on `fail`.
- `recover`: may proceed to repair stale or contradictory truth.

### Gate Checks

The gate should inspect the applicable `AGENTS.md` and determine whether it contains enough durable guidance for:

- project purpose
- goals and non-goals
- repository map
- important commands
- architecture boundaries
- risk and permission rules
- human confirmation gates
- definition of done

### Decline Memory

If the user declines AGENTS.md creation or update, Threadsmith should record the decision in `.threadsmith/preferences.json` or another committed truth artifact.

After a decline, do not repeat the same prompt unless:

- the user asks to revisit project constitution
- project risk level increases
- scope changes materially
- `.threadsmith/` and AGENTS.md contradict each other
- the previous decline is stale for the current task

### Monorepo Rule

- Nearest applicable `AGENTS.md` wins for local task behavior.
- Root `AGENTS.md` provides global fallback constraints.
- Parent/child conflicts route to hygiene instead of silently choosing the convenient rule.

## Control Deck Boundary

The skill protocol comes first. The Control Deck should stay a display and configuration surface for now.

Later, it may show derived charter status:

- `pass`, `warn`, `fail`, or `bypassed`
- source path
- missing fields
- residual risk
- next safe action

Do not make the deck the primary AGENTS.md editor in this phase.

## Product Issue Migration

Previously diagnosed issues from the divergent `Threadsmith` repository must be rechecked in this repo before implementation:

- repeated next-step wording after the user confirms a suggestion
- output too terse to explain previous step, next step, architecture layer, and stop condition
- AGENTS.md missing/incomplete project constitution not being surfaced early enough
- stale `.threadsmith` truth causing confusing current phase and release state
- product/runtime surfaces not clearly showing whether state is committed truth, derived packet, or UI interpretation

## Steps

1. Sync the 2026-05-22 output-contract wording into `codex/skills/threadsmith/SKILL.md`.
2. Reset `.threadsmith/` truth to `canonical workflow repair v1`.
3. Keep frontend work frozen except for necessary display correctness.
4. Implement Project Charter Gate as a skill-first protocol change in the repo skill and references.
5. Add lightweight fixtures or tests for missing, placeholder, useful, declined, and conflicting AGENTS.md states.
6. Recheck product/runtime issues in `threadsmith-control-deck` after the skill contract is stable.

## Verification

Run:

```bash
node -e "for (const f of require('fs').readdirSync('.threadsmith')) if (f.endsWith('.json')) JSON.parse(require('fs').readFileSync('.threadsmith/' + f, 'utf8'))"
git diff --check
```

For the next implementation slice, add focused checks for:

- missing AGENTS.md
- placeholder-only AGENTS.md
- useful AGENTS.md
- declined setup
- AGENTS.md / `.threadsmith/` conflict

## Risks

- If the gate is too strict, low-risk inspection becomes annoying.
- If the gate is too loose, it becomes decorative and fails to protect architecture/risk boundaries.
- If repo source and installed skill are not separated, future work will drift again.

## Done When

- The repo skill contains the installed global output-contract improvements.
- `.threadsmith/` no longer claims the active phase is `v0.3.2 patch release`.
- This plan captures Project Charter Gate as a skill-first implementation path.
- The next slice can start from `threadsmith-control-deck` without relying on the divergent `Threadsmith` repo.
