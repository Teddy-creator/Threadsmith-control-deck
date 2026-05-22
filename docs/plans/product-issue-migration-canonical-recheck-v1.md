# Product Issue Migration / Canonical Recheck v1 Implementation Plan

Goal: Recheck previously reported Threadsmith product experience issues inside
`threadsmith-control-deck`, the canonical repo, and fix only skill/protocol
issues that still reproduce here.

Scope:

- Re-audit product issues that were previously discussed or diagnosed while the
  work drifted between the installed global skill, the historical `Threadsmith`
  repo, and this canonical repo.
- Classify each issue as fixed by the Project Charter Gate work, still present
  in the skill/runtime, deferred because it is frontend-only, or stale/not
  reproducible.
- Implement the smallest canonical repo fixes for confirmed issues.
- Keep this pass focused on developer comprehension and workflow confidence.

Non-goals:

- Installing or overwriting `/Users/cloud/.codex/skills/threadsmith`.
- Publishing a release.
- Reworking the Control Deck visual style.
- Maintaining or improving frontend surfaces by default.
- Implementing multi-provider automation.
- Reopening historical repo fixes without revalidation here.

Assumptions:

- `threadsmith-control-deck` is the canonical source.
- Frontend work is frozen by user decision. Control Deck clarity issues are
  recorded as deferred unless they block skill/protocol truth.
- Skill/protocol fixes are the active priority.
- The Project Charter Gate and Project Charter Quality slices are already
  implemented locally but not committed.

## Product Issues To Recheck

### 1. Repeated next-step wording after confirmation

User symptom:

- After the assistant says "next step is X" and the user says "agree", the
  assistant sometimes repeats "next step is X" instead of executing or clearly
  saying why it is not executing.

Canonical recheck:

- Inspect `codex/skills/threadsmith/SKILL.md` output contract.
- Inspect `references/action-contracts.md` preview and stop-and-ask rules.
- Confirm whether the current output contract distinguishes:
  - last completed step
  - current decision
  - next concrete action
  - stop condition

Canonical status:

- Fixed in skill contract by acknowledgement handling and the action-contract
  acknowledgement rule.

Remaining fix:

- Add a rule that if the previous recommendation has just been accepted, the
  next Threadsmith response should either execute the accepted next action or
  explicitly say which gate prevents execution. It should not restate the same
  recommendation as a new suggestion.

### 2. Output too terse for architecture comprehension

User symptom:

- Threadsmith responses sometimes tell the next action but not what layer of the
  project is being changed, why that matters, or how it fits the architecture.

Canonical recheck:

- Inspect the current Threadsmith output contract.
- Decide whether to add a compact "Architecture / ownership impact" line to the
  standard response, without making every response huge.

Canonical status:

- Partially fixed by the current output contract.

Remaining fix:

- Strengthen the output-contract requirement for significant work so the user
  can see the affected layer, object/module, reason it matters, and whether the
  work changes product behavior, project truth, skill protocol, tests, or docs.

### 3. AGENTS.md missing or incomplete not surfaced early enough

User symptom:

- New projects without project constitution did not reliably trigger an early
  guided AGENTS.md path.

Canonical recheck:

- Already addressed by Project Charter Gate and Project Charter Quality v1.
- Verify tests cover missing, placeholder, incomplete, declined, and thin
  guidance states.

Canonical status:

- Fixed for current scope. Tests cover missing, placeholder, incomplete,
  declined setup, and thin guidance states.

Likely fix:

- No new implementation unless a gap is found.

### 4. Stale `.threadsmith` truth causing confusing phase/release state

User symptom:

- The deck or skill sometimes reported stale release/phase status after the
  actual branch had moved on.

Canonical recheck:

- Inspect current `.threadsmith` truth after closeout.
- Inspect context recovery and truth confidence runtime surfaces.
- Confirm whether app home or server bridge still says stale release claims.

Canonical status:

- Partially fixed by closeout truth reset. This pass should finish by recording
  a clear product-issue recheck state in `.threadsmith/`.

Likely fix:

- Patch only skill/protocol truth wording if it still conflicts with canonical
  truth. Frontend fixture copy is deferred while frontend is frozen.

### 5. Product/runtime surfaces not clearly labeling truth source

User symptom:

- It can be hard to tell whether a statement comes from committed `.threadsmith`
  truth, a derived Context Packet, UI interpretation, or demo fixture.

Canonical recheck:

- Inspect Control Deck labels around project source, refresh status, latest run,
  context packet, and project workbench.
- Confirm whether the source label is explicit enough.

Canonical status:

- Skill/runtime source-layer labeling exists. Frontend label work is deferred.

Likely fix:

- Add or adjust compact labels only in skill/protocol surfaces where ambiguity
  is confirmed.

## Canonical Recheck Classification

| Issue | Status | Decision |
| --- | --- | --- |
| Repeated next-step wording after confirmation | fixed / harden | Keep acknowledgement rule and make the output contract say whether the accepted action was executed or blocked. |
| Output too terse for architecture comprehension | still present | Strengthen skill output contract with a compact architecture comprehension line. |
| AGENTS.md missing or incomplete not surfaced early enough | fixed | Covered by Project Charter Gate and focused tests. |
| Stale `.threadsmith` truth causing confusing phase/release state | partially fixed | Finish this phase by updating committed truth to this recheck result. |
| Truth source labeling unclear | skill fixed, frontend deferred | Keep source-layer labels in skill/runtime; defer Control Deck label polish while frontend is frozen. |

## Files

- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `codex/skills/threadsmith/references/role-contracts.md`
- Modify: `.threadsmith/*.json`
- Deferred: `apps/control-deck/**`
- Tests: focused runtime / orchestrator / control-deck tests depending on
  confirmed issue.

## Steps

1. Audit current skill contracts against issues 1 and 2.
2. Patch the output/action contract if repeated next-step or architecture
   context gaps still exist.
3. Audit current `.threadsmith` truth for stale release or phase claims.
4. Patch only confirmed stale skill/protocol truth or source ambiguity.
5. Run focused tests and `git diff --check`.
6. Write closeout truth with which issues were fixed, already resolved, or
   deferred.

## Verification

Run at minimum:

```bash
node -e "for (const f of require('fs').readdirSync('.threadsmith')) if (f.endsWith('.json')) JSON.parse(require('fs').readFileSync('.threadsmith/' + f, 'utf8'))"
npm run test --workspace @threadsmith/runtime -- projectCharterGate.test.ts
npm run test --workspace @threadsmith/orchestrator
git diff --check
```

Control Deck tests are not required unless the frontend freeze is explicitly
lifted.

## Risks

- Overcorrecting skill output could make every response too long.
- Editing deck copy during the frontend freeze could reintroduce visual clutter
  and slow the skill/protocol track.
- Historical repo fixes may look attractive but must not be copied blindly.

## Done When

- Each product issue above has a canonical repo classification.
- Confirmed issues have minimal fixes and tests.
- Stale or non-reproducible issues are explicitly marked as such.
- No global skill installation, release, or visual redesign happened in this
  pass.
