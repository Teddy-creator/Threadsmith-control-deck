# Threadsmith Human-Centered Governance v1 Implementation Plan

Goal: make Threadsmith feel like a low-friction development partner while
preserving its value as a project state store, safety gate, and cross-agent
handoff bridge.

Scope: reduce protocol heaviness in everyday use by formalizing lighter
execution modes, tiering truth writeback, improving next-step explanations,
adding project-configurable value heartbeat language, and defining document /
test hygiene rules.

Non-goals: Asterlea-specific hardcoding, frontend redesign, multi-provider
routing, release automation, weakening destructive / release / credential /
cross-agent safety gates, or removing committed truth as the authority.

Assumptions:

- The current Adaptive Work Session Mode v1 remains the baseline.
- Threadsmith should keep strict governance for audit events, but ordinary
  implementation should foreground project capability and user-visible value.
- Project-specific product language belongs in AGENTS.md, project brief, or
  preferences, not as hardcoded Threadsmith core rules.
- This plan should improve Threadsmith generically for code libraries, apps,
  creative-engineering projects, docs-heavy projects, and cross-agent projects.

Verification:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/orchestrator`
- targeted `npm run test --workspace @threadsmith/fs-bridge` if writeback
  implementation changes fs-bridge
- targeted app tests only if a presentation model changes
- `npm run verify:project-truth`
- `git diff --check`

## Problem Summary

Threadsmith has moved from "too heavy to use comfortably" to "useful but still
too governance-forward." The remaining problem is not that Threadsmith lacks
state or safety. The problem is that protocol language, truth maintenance, and
document production still reach the operator too often.

The intended shift:

```text
from: phase / role / closeout centered governance
to: project capability / next concrete action / right-sized evidence centered collaboration
```

## Design Principles

- Keep protocol strict internally, but make the operator-facing layer human.
- Prefer capability-first language: what the project can now do, then the
  technical object that made it possible.
- Treat `phase`, `role`, `closeout`, `truth`, and `packet` as internal
  machinery unless the operator needs to audit or decide.
- Do not solve heaviness by deleting safety; solve it by routing safety to the
  right tier.
- Use project-configurable value heartbeat questions rather than hardcoded
  product language.
- Avoid adding another large state surface unless an existing file cannot carry
  the new signal safely.

## Files

- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `codex/skills/threadsmith/references/role-contracts.md`
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Modify: `packages/domain/src/preferences.ts`
- Modify: `packages/domain/src/preferences.test.ts`
- Modify: `packages/runtime/src/nextBestStep.ts`
- Modify: `packages/runtime/src/nextBestStep.test.ts`
- Modify: `packages/runtime/src/nextBestStepModel.ts`
- Modify: `packages/runtime/src/contextBudget.ts`
- Modify: `packages/runtime/src/contextBudget.test.ts`
- Modify: `packages/runtime/src/health.ts`
- Modify: `packages/runtime/src/health.test.ts`
- Optional modify: `packages/fs-bridge/src/workflowRunWriteback.ts`
- Optional modify: `packages/fs-bridge/src/workflowContextSync.ts`
- Optional modify: `packages/fs-bridge/src/phaseHistory.ts`
- Optional modify: `apps/control-deck/src/features/deck/inspectors/action/model.ts`
- Optional create: `docs/plans/index.md`
- Optional create: `docs/reports/threadsmith-docs-hygiene-inventory-v1.md`
- Create: `docs/reports/threadsmith-human-centered-governance-v1-closeout.md`

## Concepts

### Operating Modes

Threadsmith should expose three ordinary work modes:

- `full-governance`: strict phase / role / verification / closeout flow for
  architecture boundaries, release, cross-agent state, provider routing,
  destructive actions, or unclear product semantics.
- `normal-implementation`: default mode for bounded implementation. It may use
  work sessions, focused verification, short closeout, and current-packet /
  evidence writeback instead of full truth churn.
- `light-repair`: small fixes, copy corrections, test expectation updates,
  narrow code repairs, or local cleanup. Test expectation updates only qualify
  when an accepted spec, snapshot copy change, or confirmed behavior change
  supports the new expectation. It should prefer focused verification and
  evidence summary over full `.threadsmith` writeback.

These modes should not bypass hard stops. They only choose how much protocol,
truth writeback, and output ceremony is appropriate.

### Mode Selection Rules

Default selector:

- choose `light-repair` for one-surface fixes, copy edits, focused test
  expectation updates backed by an accepted behavior change, and local cleanup
  that does not claim durable phase acceptance
- choose `normal-implementation` for ordinary bounded implementation, related
  multi-file work sessions, focused refactors, and behavior covered by existing
  acceptance
- choose `full-governance` for architecture boundaries, release / PR / merge,
  cross-agent state, provider routing, destructive actions, credentials, new or
  changed public behavior with unclear semantics, compatibility risk, release
  impact, or product safety risk, or stale / contradictory truth
- when uncertain between `light-repair` and `normal-implementation`, choose
  `normal-implementation`
- when uncertain between `normal-implementation` and `full-governance`, choose
  `full-governance` only if a real stop gate exists; otherwise choose
  `normal-implementation` and explain the residual risk

### Truth Writeback Tiers

Threadsmith should choose one of three writeback tiers:

- `evidence-only`: no committed truth changes. Evidence may live in the final
  response, command output, test output, local run artifact, or a short evidence
  summary when needed. If evidence is written into `.threadsmith`, it must be an
  evidence / runtime artifact, not a committed truth state update.
  `evidence-only` should not mutate project state files unless the project has
  explicitly configured an evidence-only runtime artifact path for that purpose.
- `current-context`: update current packet, active work, or evidence summary
  because the next operator turn needs the fact.
- `committed-truth`: update phase, acceptance, status, supervision, role
  packets, handoff, proposal review, or phase history because the project state
  changed.

Default mapping:

- small low-risk repair: `evidence-only`
- ordinary implementation work session: `current-context`
- accepted phase, blocker, failed verification, scope change, scope-changing
  user decision, durable product or architecture decision, release, provider,
  destructive action, or cross-agent state: `committed-truth`

Truth writeback examples:

- typo fix in docs: `evidence-only`; mention changed file and verification in
  final response
- ordinary implementation with focused tests: `current-context`; update current
  packet or evidence summary only if the next turn needs the fact
- architecture boundary or new public command: `committed-truth`; update phase /
  acceptance and use full-governance
- failed verification: `committed-truth`; record blocker or repair target
- short approval such as "同意": no writeback by itself unless it changes scope,
  product direction, architecture, acceptance, or durable route
- cross-agent handoff or writeback proposal adoption: `committed-truth`

### Operator-Facing Output Shape

Default user-facing answers should foreground:

1. what changed in the project
2. what the user can understand or do now
3. why the next step is the right next step
4. what is still not changed

Protocol names should appear only after the plain explanation, or inside audit
sections where the operator needs source-level accountability.

For "what is next?" answers, Threadsmith should return:

- concrete action in plain language
- affected layer in plain language
- why now
- expected deliverable
- verification level
- stop reason, only if one exists

It should not answer with only a new phase name.

If the next step is inside the current accepted work session, Threadsmith should
execute it or report the blocking gate instead of asking for approval again.

Output budgets:

- `light-repair`: 3-5 concise lines by default: changed, verification, risk if
  material, next if any
- `normal-implementation`: short closeout with capability, verification,
  writeback tier, and next concrete action
- `full-governance`: full audit skeleton only when a real audit boundary exists

Operator-facing vocabulary:

- avoid foregrounding dense protocol terms such as `phase`, `role`, `packet`,
  `truth`, `closeout`, `surface`, and `boundary` without plain-language
  translation in ordinary answers
- use those terms when the user asks about Threadsmith itself, when an audit
  boundary is active, or when source-layer accountability matters
- translate every dense term the first time it appears in an answer

Capability translation:

- every next step or closeout should name the technical object and the project
  capability it enables
- if the capability is not user-visible yet, say so directly and name the
  internal layer that changed

### Project Value Heartbeat

Threadsmith core should provide a generic heartbeat mechanism. Projects may
customize heartbeat language through AGENTS.md, project brief, or preferences.

Default trigger for v1: recommend a heartbeat after three governance-heavy
sessions, after three internal-only phases, or at a phase boundary where the
next recommendation would continue technical depth without a user-visible or
operator-visible capability change. The heartbeat is advisory and must not
interrupt an accepted implementation path.

Definitions:

- governance-heavy means a `full-governance` session or a closeout that updates
  committed truth across acceptance, phase, provider, release, or cross-agent
  state
- internal-only means the work changed internal structure, tests, docs, or
  state machinery without creating a user-visible or operator-visible project
  capability

Generic heartbeat questions:

- did the project become more usable, understandable, reliable, or closer to
  its stated goal?
- is the next engineering step still the highest-value direction?
- should the project return to product surface, user experience, architecture
  map, or behavior validation?

Project-specific heartbeat examples must remain examples, not hardcoded rules.

### Document Hygiene

Not every work session needs a `docs/plans` file.

Suggested document tiers:

- long-lived specs: architecture, protocols, state contracts, public behavior
- implementation plans: multi-file or risky work that needs review
- closeout reports: audit or major standard phases only
- evidence summaries: small work sessions and focused verification
- temporary artifacts: generated smoke outputs and run artifacts

`docs/plans` should get an index or archive policy before plan count grows
further. For this plan, the index is conditional: first create an inventory
report when plan sprawl is high, then decide whether a real index or archive
phase is needed.

Docs vs `.threadsmith` boundary:

- docs record reusable decisions, implementation rationale, architecture
  explanations, and long-lived protocols
- `.threadsmith` records current state, active work, next action, acceptance,
  evidence pointers, handoff, and proposal status
- do not duplicate long conclusions in both places unless one is a durable
  spec and the other is a short current-state pointer

### Test Hygiene

Threadsmith should distinguish:

- unit tests: pure functions and schema behavior
- contract tests: skill / runtime protocol invariants
- smoke tests: integration path with minimal fixtures
- e2e tests: browser or launcher-facing behavior
- behavior samples: prompt / role behavior examples that are not proof of real
  live-provider quality

Large smoke files should be split when they mix unrelated subsystems or become
hard to navigate. Soft split threshold: a smoke file exceeds roughly 600 lines,
mixes more than three subsystems, or a single failure requires reading unrelated
fixtures to locate the cause.

Mock evidence disclaimer:

- mock-first verification proves structure, boundaries, and writeback behavior
- it does not prove real live-provider behavior is natural, high quality, or
  product-ready
- closeout should say when verification is structural rather than experiential

Smoke debt is report-only in this plan. Do not split large smoke files here
unless this plan's own changes directly break those tests.

### Backwards Compatibility

Existing `.threadsmith` projects should not require a one-time schema migration.
New operating-mode or writeback-tier fields should be optional and should appear
gradually on the next relevant writeback. Readers must treat missing mode /
tier fields as legacy `normal-implementation` / `committed-truth` only when
that interpretation is safe.

Unsafe legacy fallback: when a reader cannot safely classify missing mode / tier
fields, it must fall back to `full-governance` + `committed-truth` and explain
which signal was missing.

### No New State Surface Unless Necessary

Prefer existing preferences, runtime recommendation metadata, context budget,
health, evidence summary, and packet fields. Add new state only when the value
cannot be represented safely in an existing surface, and protect the new field
with tests.

### Regression Fixtures For Human-Centered Output

Add fixtures or tests for these operator-facing transcripts:

- user asks "what is next?"
- user replies "同意"
- light repair completes
- normal implementation completes
- full-governance closeout completes

Suggested targets:

- `packages/runtime/src/humanCenteredOutput.test.ts`
- `packages/orchestrator/src/operatorOutput.test.ts`
- `packages/runtime/fixtures/human-centered-output/*.json`

The fixtures should catch regressions where Threadsmith returns to
phase-name-only recommendations, repeats accepted recommendations, or foregrounds
protocol terms without translating project capability.

## Steps

1. Add operating-mode language to the skill contract.
   - Outcome: `full-governance`, `normal-implementation`, and `light-repair`
     are defined without weakening audit stops.
   - Check: `verify-threadsmith-skill-contract` protects the mode names and
     safety invariant.

2. Add truth writeback tier rules.
   - Outcome: skill and runtime contracts distinguish `evidence-only`,
     `current-context`, and `committed-truth`.
   - Check: contract tests require hard-stop conditions to stay
     `committed-truth`.

3. Add next-step explanation contract.
   - Outcome: "what is next?" answers must include plain action, affected
     layer, why now, deliverable, verification level, and stop reason only when
     relevant.
   - Check: skill contract tests prevent phase-name-only recommendations.

4. Extend runtime next-best-step metadata.
   - Outcome: runtime can label recommendations with operating mode and
     writeback tier where deterministic.
   - Check: `nextBestStep` tests cover light repair, normal implementation,
     full governance, and stale pending-decision fallback.

5. Add project-configurable value heartbeat fields.
   - Outcome: preferences or project metadata can carry heartbeat focus without
     hardcoding Asterlea language.
   - Check: domain tests parse default generic heartbeat and project-specific
     override safely.

6. Update Context Packet budget guidance.
   - Outcome: current packets preserve high-signal current context while moving
     older plans, history, and repeated conclusions out of the active packet.
   - Check: context budget tests distinguish high-signal evidence from
     history accumulation.

7. Define document hygiene policy.
   - Outcome: Threadsmith knows when to create a plan, closeout report,
     evidence summary, or no document.
   - Check: contract documentation includes document tiers and anti-duplication
     rules for `.threadsmith` vs docs.

8. Add a docs/plans inventory, and create an index only if the inventory proves
   it is needed.
   - Outcome: plan sprawl becomes visible without turning this slice into a
     broad documentation reorganization.
   - Check: inventory classifies current plan families and recommends whether
     an index / archive phase is warranted.
   - Soft trigger: plan count is high enough to make current authority unclear,
     users repeatedly ask which plan is current, or existing docs cannot identify
     current authority without reading several historical plans.

9. Define test hygiene policy.
   - Outcome: Threadsmith output and closeouts distinguish unit, contract,
     smoke, e2e, and behavior-sample verification.
   - Check: skill contract and closeout guidance require verification type,
     not just "tests passed."

10. Audit obvious near-term technical debt.
    - Outcome: record whether large smoke/runtime files need immediate split or
      should be tracked as follow-up.
    - Check: create a short report rather than mixing unrelated refactors into
      this slice.

11. Write closeout report.
    - Outcome: future operators can understand what changed in daily
      Threadsmith usage and what remains follow-up.
    - Check: closeout report includes examples for ordinary code projects and
      creative-engineering projects without hardcoding either one.

## Acceptance Criteria

- Threadsmith can explicitly choose `full-governance`,
  `normal-implementation`, or `light-repair`.
- Mode selection rules define default behavior for clear and ambiguous cases.
- Small repairs no longer imply full `.threadsmith` writeback.
- Ordinary implementation can use current-context writeback without losing
  safety or evidence.
- Audit events still require committed truth and full safety stops.
- "Next step" output cannot be only a phase name.
- Short approvals execute accepted work or report a real gate instead of
  repeating the recommendation.
- User-facing output foregrounds project capability before protocol vocabulary.
- Output budgets are enforced for light repair, normal implementation, and
  full-governance.
- Dense protocol terms are translated when they must appear.
- Next-step and closeout output include capability translation.
- Value heartbeat is generic and project-configurable.
- Legacy projects without mode / tier fields fall back safely.
- Human-centered output regression fixtures exist for next-step, approval,
  light-repair, normal implementation, and full-governance closeout cases.
- Document creation is tiered; small work sessions can avoid new `docs/plans`
  files.
- Verification language distinguishes test types and does not imply product
  quality from mocks alone.
- Existing Adaptive Work Session behavior remains valid.

## Risks

- Lightening the protocol could accidentally weaken safety boundaries.
- Adding mode metadata could make Threadsmith feel more complex if the mode
  leaks into every answer.
- Truth writeback tiers could diverge from fs-bridge behavior unless tests
  protect the file-level mapping.
- Project-specific heartbeat language could be mistaken for global Threadsmith
  policy.
- Documentation hygiene could become another documentation project if not kept
  narrow.
- Test hygiene could expand into broad refactoring if smoke-test debt is fixed
  too early.

## Stop Conditions

- Any change allows executor to skip reviewer, verifier, or closeout gates for
  work that claims durable phase acceptance or committed-truth state change.
- Any change allows destructive git, release, provider, credential, public sync,
  or cross-agent state mutation without explicit stop.
- Any change writes project-specific product language into Threadsmith core as a
  hard rule.
- The plan starts requiring frontend redesign to be useful.
- The implementation expands into large smoke-test refactors before the
  operating-mode and writeback-tier contracts are stable.

## Done When

- Skill contracts describe operating modes, truth writeback tiers, next-step
  explanation rules, document hygiene, and test hygiene.
- Runtime/domain tests cover deterministic mode and writeback-tier metadata.
- Context budget tests protect current-state orientation.
- Contract verification prevents regression to phase-name-only recommendations.
- A closeout report explains the new daily usage in plain language.
- Required verification commands pass.
