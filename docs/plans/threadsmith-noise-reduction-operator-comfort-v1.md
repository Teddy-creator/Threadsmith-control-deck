# Threadsmith Noise Reduction and Operator Comfort v1 Implementation Plan

Goal: make Threadsmith feel lighter in real projects by reducing unnecessary
state writeback, narrowing stop gates, making closeouts human-first, and
preserving safety only where the risk actually justifies full governance.

Scope: improve the generic Threadsmith skill and runtime recommendation rules
for ordinary development sessions. This plan targets protocol noise, closeout
heaviness, confusing next-step recommendations, over-eager document creation,
truth writeback churn, and operator-facing explanation quality.

Non-goals: Asterlea-specific behavior, frontend redesign, release automation,
removing verification, weakening destructive / credential / release gates,
removing committed truth, or replacing project-level AGENTS.md guidance.

Assumptions:

- The Human-Centered Governance v1 and Adaptive Work Session Mode v1 contracts
  are the baseline.
- Threadsmith should remain a safety belt and project log, not the product
  direction owner.
- The same improvements should work for app projects, libraries, CLIs,
  creative-engineering projects, docs-heavy projects, and cross-agent projects.
- Project-specific teaching language belongs in AGENTS.md, project brief, or
  preferences; Threadsmith core should provide generic hooks and defaults.

Verification:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/orchestrator`
- targeted fs-bridge tests if writeback code changes
- `npm run verify:project-truth`
- `git diff --check`
- `npm run verify:skill-sync` only after an intentional global skill sync

## Problem Summary

Threadsmith is now meaningfully better at avoiding repeated approvals and
recommendation loops, but it can still make ordinary development feel like a
governance exercise.

Current failure modes:

- small tasks can still create large `.threadsmith` diffs;
- small developer-only entries can be treated like major public surfaces;
- closeout can still sound like a protocol report instead of a development
  partner's summary;
- next-step recommendations can name a phase without explaining the concrete
  work, affected layer, and done-when evidence;
- value heartbeat is advisory but not strong enough to counter long runs of
  internal-only governance;
- short approval inheritance is useful but unsafe when the previous
  recommendation was ambiguous;
- docs and closeout artifacts can become default output instead of durable
  artifacts only when future readers need them.

The intended shift:

```text
from: every completed slice deserves full truth and full closeout
to: each slice gets the smallest durable record that preserves safety, recovery, and next-step clarity
```

## Design Principles

- Make the default operator experience human-first, then audit-friendly.
- Treat full governance as a safety tier, not a default writing style.
- Prefer work sessions for related small actions inside an accepted direction.
- Preserve strict stops for public semantics, compatibility, release,
  destructive actions, credentials, provider defaults, and cross-agent state.
- Do not write long-lived docs or committed truth unless another thread,
  another agent, or a future recovery path will realistically need them.
- Always translate protocol and architecture terms into plain operator language
  when they appear in user-facing output.
- When the user says "同意", continue only if the previous recommendation was
  unique, concrete, in scope, and executable.

## Files

- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `codex/skills/threadsmith/references/role-contracts.md`
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Modify: `packages/domain/src/preferences.ts`
- Modify: `packages/domain/src/preferences.test.ts`
- Modify: `packages/runtime/src/nextBestStep.ts`
- Modify: `packages/runtime/src/nextBestStepModel.ts`
- Modify: `packages/runtime/src/nextBestStep.test.ts`
- Modify: `packages/runtime/src/humanCenteredOutput.test.ts`
- Modify or create: `packages/runtime/fixtures/human-centered-output/*.json`
- Optional modify: `packages/fs-bridge/src/*` only if writeback tier behavior is
  enforced in fs-bridge rather than documented at the skill/runtime layer.
- Optional modify: `packages/orchestrator/src/*` only if short approval routing
  or command capability detection is implemented there.
- Optional create: `docs/reports/threadsmith-noise-reduction-operator-comfort-v1-closeout.md`.
  Create it only if this change needs durable audit evidence because it changes
  the global skill contract or future recovery behavior. Ordinary small tasks
  should not create a report by default.

## Implementation Order

Implement in risk/value order rather than trying to change every surface at
once:

1. Output and closeout shape: human-first full output, compact protocol footer,
   next-step concreteness, verifier / fixture updates.
2. Writeback tier hardening: file allowlist, docs durability rule, and tests for
   expected writeback tier.
3. Surface and approval safety: `surfaceAudience`, developer-only stop-gate
   narrowing, short approval uniqueness / executability checks.
4. Operator comfort refinements: value heartbeat, teaching / architecture
   explanation preference, timestamp standard, dirty-worktree reminder policy,
   and command capability detection.

Stop after each group if verification fails, if the change requires a new state
surface not listed in this plan, or if the implementation starts expanding into
release automation, frontend work, or project-specific behavior.

## Implementation Steps

### 1. Make full closeout human-first

Tighten the output contract so full closeout starts with `一句话结论`, then the
phase result, concrete changes, solved problem, verification, and next phase
preview. Move `Threadsmith Decision` to the end as a compact protocol footer.

Required behavior:

- closeout must not open with a long protocol state list;
- `Threadsmith Decision` should contain only mode, source layer, role-chain
  status, and stop condition;
- next phase preview must include why now, deliverables, done-when, and stop
  condition;
- if multiple options are presented, one recommendation must be selected first
  and the tradeoff must be explained in the required fields.

Verification:

- update `scripts/verify-threadsmith-skill-contract.mjs`;
- keep or add fixture coverage that rejects option-only next-step output;
- update any exact skeleton verifier or fixture that assumed
  `Threadsmith Decision` appears first.

### 2. Reduce truth writeback by default

Clarify and enforce the difference between:

- `evidence-only`: no committed project state mutation;
- `current-context`: update only the next-turn context or evidence needed to
  avoid confusion;
- `committed-truth`: update phase / acceptance / status / packets only for
  durable project state changes.

Required behavior:

- light repairs should not update multiple `.threadsmith` state files;
- normal implementation should update committed truth only at real acceptance,
  blocker, failed verification, scope change, or recovery boundaries;
- closeout artifacts should not be created just because work completed;
- role packets should not be rewritten when their content would merely repeat
  current packet facts.

Writeback tier file allowlist:

| Tier | Default `.threadsmith` writes | Allowed examples | Disallowed examples |
| --- | --- | --- | --- |
| `evidence-only` | 0 committed state files | final response, command output, test output, local run artifact outside committed truth | `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`, `.threadsmith/project-status.json`, role packets |
| `current-context` | only next-turn context / evidence when needed | `.threadsmith/context/current-packet.json`, `.threadsmith/context/evidence-summary.json`, `.threadsmith/active-work.json` when it affects the next action | project brief, roadmap, phase acceptance, provider routing, skill routing, phase history |
| `committed-truth` | durable project state only at real boundaries | `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`, `.threadsmith/project-status.json`, `.threadsmith/project-brief.json`, `.threadsmith/project-roadmap.json`, `.threadsmith/project-supervision.json`, `.threadsmith/context/role-packets/*.json`, `.threadsmith/history/phases.jsonl`, handoff / routing files when those surfaces actually changed | broad rewrites of unrelated truth files, role packet rewrites that only restate current packet facts |

If a project lacks the listed optional context files, do not create them just to
satisfy a tier. Use the closest existing evidence surface, or keep the evidence
in the final response.

For `evidence-only` local run artifacts, prefer ignored or temporary paths such
as `tmp/`, `.cache/`, or an existing project-specific ignored run directory.
The final response should state whether a temporary artifact was left behind
and whether it is safe to delete.
If whether the path is ignored is unknown, the final response must label it as
an `untracked artifact risk` instead of treating it as clean evidence.

Verification:

- add runtime tests for recommendation metadata and expected writeback tier;
- at minimum cover writeback tier, `surfaceAudience`, short approval safety,
  and next-step concreteness;
- add contract text that states what files may change for each tier;
- if fs-bridge behavior changes, add focused fs-bridge tests.

### 3. Narrow stop gates for developer-only surfaces

Change the "new CLI / API / UI must pause" rule into a risk-based rule.

Required behavior:

- developer-only helpers inside an already approved scope may continue under
  `normal-implementation` when semantics are clear and verification is focused;
- public/user-facing commands, compatibility-affecting APIs, product semantics,
  provider defaults, credentials, release behavior, destructive actions, or
  cross-agent state still require `full-governance` or operator review;
- the output must explain whether the surface is developer-only, internal, or
  user/public-facing.

Runtime recommendation metadata should include:

- `surfaceAudience: "internal" | "developer" | "operator" | "user_public"`
- `workVisibility: "internal" | "developer_visible" | "operator_visible" | "user_visible"`

Classification:

- `internal`: implementation-only object with no direct operator entry.
- `developer`: helper for maintainers, tests, local scripts, diagnostics, or
  repo maintenance inside an approved scope.
- `operator`: command, prompt, UI, or workflow surface used by the person
  operating the project but not by public end users.
- `user_public`: external end-user behavior, public API / CLI, published docs,
  compatibility surface, release behavior, or shared integration.

Ambiguous surface audience defaults to `operator` or `user_public` based on the
highest plausible audience and should pause if semantics are unclear.

`workVisibility` should not exceed the actual impact range implied by
`surfaceAudience` unless the recommendation explicitly explains the mismatch,
such as a developer tool that changes user-visible generated output.

Operator surface rule:

- `operator` surfaces may continue inside an already approved scope when they
  are local, reversible, and do not change long-term workflow semantics.
- upgrade `operator` surfaces to `full-governance` when they change workflow
  meaning, create a long-lived operator/public entry point, affect
  compatibility, alter default behavior, or could reasonably be mistaken for a
  public/user-facing surface.
- local developer harnesses can be `developer` when they are only maintainers'
  verification tools; they become `operator` when they are a normal way for the
  project owner to run, inspect, or steer the project.
- developer-only long-lived helpers may remain `normal-implementation` when
  they are local, reversible, clearly non-public, and inside the approved scope.

Verification:

- add next-step fixtures for developer-only CLI helper vs public CLI command;
- ensure ambiguous surface defaults to pause or full governance.

### 4. Strengthen short approval safety

Keep the benefit of "同意" continuing the previous recommendation, but require
the inherited recommendation to be safe.

Required behavior:

- short approval may continue only when the previous recommendation is unique,
  concrete, in scope, and executable;
- if the previous recommendation offered multiple options without a selected
  recommendation, Threadsmith must ask for a choice or choose only when the
  user's wording identifies one;
- if relevant repo evidence or committed truth changed since the recommendation,
  Threadsmith must re-anchor before continuing;
- it must not repeat the same recommendation as a new answer when the safe
  continuation path is clear.

Relevant evidence means one of:

- `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`,
  relevant role packet, current packet, active work, or phase history changed;
- a source file named by the previous recommendation changed;
- the command output, failed verification evidence, or blocker that justified
  the recommendation changed;
- git evidence shows new changes in files the inherited action would edit.

Dirty worktree changes outside those surfaces should be summarized only when
they affect staging, commit safety, or likely file overlap.

Verification:

- add action contract checks for uniqueness and executability;
- add runtime/orchestrator tests if short approval routing is represented in
  code.

### 5. Make docs creation opt-in by durability

Prevent "write a closeout doc" from becoming automatic ceremony.

Required behavior:

- create long-lived plan/report docs only for architecture decisions,
  cross-thread handoff, public docs/release, product boundary decisions,
  recovery evidence, or explicit user request;
- ordinary small work sessions should use final response, command output,
  current context, or evidence summary instead;
- docs should say why they are durable if created.

Verification:

- add skill contract checks for durable-doc criteria;
- update closeout role contract to avoid default report creation for light
  repair and normal implementation.

### 6. Strengthen generic value heartbeat

Make the value heartbeat visible enough to counter long governance runs without
hardcoding any one project.

Required behavior:

- after repeated governance-heavy or internal-only accepted sessions,
  Threadsmith should recommend a lightweight value check at the next boundary;
- the heartbeat should ask whether the next local engineering step is still
  highest value;
- project-specific wording may come from AGENTS.md, project brief, or
  preferences;
- the heartbeat must not interrupt an accepted implementation path unless a
  real stop gate appears.

Deterministic v1 trigger:

- trigger once after 3 consecutive `full-governance` or internal-only accepted
  sessions without a value heartbeat;
- trigger only at the next phase boundary or work-session closeout;
- reset when the operator accepts, performs, or explicitly skips the heartbeat.

Counter source:

- derive from `.threadsmith/history/phases.jsonl` when phase history exists;
- otherwise derive from closeout evidence available in current context or
  evidence summary;
- do not add a new durable counter file in v1 unless the existing phase history
  and evidence surfaces cannot represent the trigger reliably.

Closeout evidence required for a computable heartbeat:

- `governanceMode`: `light-repair` / `normal-implementation` /
  `full-governance`
- `surfaceAudience`: `internal` / `developer` / `operator` / `user_public`
- `workVisibility`: `internal` / `developer_visible` / `operator_visible` /
  `user_visible`
- `valueHeartbeatShown`: `true` / `false` / `skipped`

If these fields are missing from old closeouts, do not infer them from vague
text unless the answer is obvious. Treat the old entry as unknown and avoid
rewriting it solely for heartbeat accounting.

Write these fields first to the phase history entry when phase history exists.
If no phase history exists, write them to the evidence summary. The final
response can display the same fields for the operator, but it is not the
long-term counter source.

Verification:

- add fixture coverage for internal-only consecutive sessions triggering a
  value heartbeat;
- add preference tests for configurable heartbeat questions.

### 7. Improve teaching and architecture translation

Make Threadsmith inherit project-level teaching preferences while staying
generic.

Required behavior:

- dense terms must be translated the first time they appear;
- next-step answers should include the affected layer in plain language;
- closeout should say whether a change is user-visible, developer-facing, or
  internal foundation;
- if AGENTS.md asks for teaching-style explanations, Threadsmith should honor
  that in operator-facing output without turning every answer into a tutorial.

Preference entry:

- add or derive `operatorExplanationStyle: "concise" | "balanced" | "teaching" | "detailed"`;
- source priority: explicit project preferences, then AGENTS.md guidance, then
  project brief / supervision, then Threadsmith default `balanced`;
- this preference changes explanation depth only. It must not change safety
  gates, verification level, or truth writeback tier.
- `detailed` means explanation depth, not governance audit mode. It must not be
  confused with closeout tier `audit` or `full-governance`.

Verification:

- add output fixtures with dense terms and expected capability translation;
- add contract checks that forbid term-only next-step descriptions.

### 8. Normalize timestamps and dirty-worktree warnings

Reduce avoidable confusion and anxiety from repeated operational warnings.

Required behavior:

- committed truth timestamps should use UTC ISO 8601 with milliseconds,
  `YYYY-MM-DDTHH:mm:ss.SSSZ`, generated by the runtime/fs-bridge writeback layer
  when Threadsmith writes durable state;
- apply the timestamp standard to new writes only. Legacy timestamps remain
  valid unless the owning file is touched for another approved reason;
- do not bulk-rewrite historical `.threadsmith` files only to normalize
  timestamps;
- closeout should not invent relative time when an exact timestamp is needed;
- operator-facing responses may display local time only as a secondary
  explanation, not as committed truth;
- dirty worktree warnings should be prominent only before stage/commit,
  destructive operations, broad edits, or files likely to overlap with user
  changes;
- ordinary read-only status should summarize dirty state once, not repeat it
  every turn.

Verification:

- add contract wording for timestamp source/format;
- add runtime or contract tests if timestamp generation is centralized.

### 9. Detect command capability before suggesting automation

Avoid suggesting Threadsmith automation commands that the target project cannot
actually run.

Required behavior:

- before recommending a command such as `npm run threadsmith:autopilot`, verify
  that the package script or command exists in the target repo;
- if unavailable, describe the manual equivalent instead of presenting the
  command as executable;
- command suggestions should identify whether they are repo-local,
  Threadsmith-control-deck-local, or globally installed.

Lookup order:

1. target project scripts or binaries, such as target `package.json`, local
   launcher scripts, or documented repo commands;
2. Threadsmith control-deck scripts only when the current working repo is
   Threadsmith control deck or the command is explicitly described as external
   tooling;
3. globally installed command only after checking availability with a safe
   read-only command lookup.

If a command is not available in the target project, say "manual equivalent"
and describe the role-chain action in plain language instead of pretending the
automation command can run there.

If the current tool environment cannot safely check command availability, do
not recommend the command as executable. State that availability was not
verified and provide the manual equivalent instead.

Verification:

- add action contract checks for command capability detection;
- add runtime/orchestrator tests if command recommendation is modeled in code.

## Acceptance Criteria

- Full closeout opens with a human-readable result, not a long protocol field
  list.
- `Threadsmith Decision` is compact and appears after the explanatory sections.
- Small repairs and developer-only helpers no longer imply broad committed
  truth writeback.
- New public/user-facing semantics still trigger full governance or operator
  review.
- Short approval inherits only unique, concrete, safe recommendations.
- Threadsmith does not create plan/report docs unless the artifact is durable
  enough to justify future maintenance.
- Value heartbeat appears after repeated internal governance work, but does not
  interrupt accepted implementation; heartbeat evidence is computable from
  recorded `governanceMode`, `surfaceAudience`, `workVisibility`, and
  `valueHeartbeatShown` fields.
- Next-step recommendations state the concrete work, affected layer, why now,
  deliverable, done-when, and stop condition; they must not provide only a phase
  name.
- Dense technical terms are translated into operator language.
- Timestamp and dirty-worktree guidance is less noisy and more precise.
- Automation commands are suggested only when available or clearly marked as
  unavailable with a manual fallback.

## Risks

- Reducing writeback too aggressively could make recovery and cross-agent
  handoff less reliable.
- Narrowing stop gates could accidentally allow public behavior changes to
  proceed without sufficient review.
- Making output more natural could hide audit details that are still needed for
  release, recovery, or cross-agent state.
- Adding too many new tests or fixtures could make the skill harder to change.

Mitigations:

- Keep `full-governance + committed-truth` for unsafe or ambiguous cases.
- Treat developer-only vs public/user-facing as an explicit classification.
- Preserve compact protocol footer for auditability.
- Add targeted regression fixtures instead of broad snapshot tests.

## Done When

- The skill contract, action contract, runtime contract, and role contract all
  describe the lighter governance behavior consistently.
- Runtime recommendation metadata can represent the new stop-gate and writeback
  distinctions.
- Regression fixtures cover human-first closeout, short approval safety,
  developer-only surface handling, value heartbeat, and docs/writeback
  restraint.
- Verification commands pass.
- If a durable closeout report is created, it records why the report is durable,
  what changed, what did not change, and whether the global skill was
  intentionally synced.
- If no durable closeout report is created, the final response plus evidence
  summary or verification output is sufficient for this plan's closeout.
