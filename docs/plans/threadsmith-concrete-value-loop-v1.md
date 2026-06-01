# Threadsmith Concrete Value Loop v1 Implementation Plan

Goal: make Threadsmith's operator-facing recommendations more concrete,
capability-oriented, and low-noise after Daily Progress Mode, without hardcoding
any single project's product language.

Scope: strengthen next-step concreteness, phase-name translation, diagnostic
budgeting, project value-loop checkpoints, evidence semantics, and work-bundle
defaults across the skill contracts and runtime recommendation metadata.

Non-goals: Asterlea-specific wording, removing Daily Progress Mode, weakening
audit / recovery / destructive / provider / release gates, changing global skill
installation during implementation, or building project-specific runtime
features. Global skill sync is a separate post-implementation / release action,
not part of ordinary implementation.

Applicability:

- The concrete next-step rule applies to next-step recommendations, Daily
  Progress Cards, phase previews, and work-bundle recommendations.
- Ordinary explanation answers such as "what does this mean?", "where are we?",
  or "why do this?" may stay shorter. They should explain first, then give a
  concrete recommendation only when the operator is asking what to do next.
- Educational interrupts take precedence over execution. When the operator says
  they are confused, asks "什么意思", "what does this mean", "I'm lost", or asks
  why a step exists, Threadsmith should pause the push-forward posture, explain
  in plain language, then offer a concrete next step. Explanation-only answers
  should not automatically start execution unless the operator has already
  authorized the current phase / continuous run and no new stop gate appears.
  The confusion question itself is not continuation approval.

Assumptions:

- Daily Progress Mode v1 should already be merged and globally synced, but this
  must be verified as a preflight check before implementation.
- Threadsmith should remain a generic workflow skill; project value language
  should come from AGENTS.md, project preferences, project brief, or committed
  Threadsmith truth.
- Modify the repository source skill under `codex/skills/threadsmith/` first.
  Do not directly edit the installed global skill copy during implementation.
  The installed copy is normally `$CODEX_HOME/skills/threadsmith/`
  (`$CODEX_HOME` often resolves to `/Users/cloud/.codex/` on this machine), but
  do not hardcode `/Users/cloud` into the skill contract. If `$CODEX_HOME` is
  unset, installed/global skill verification is `global sync not verifiable` and
  should not block source implementation. Global skill sync happens only after
  the implementation branch/change is accepted or merged into the control-deck
  source of truth and the operator explicitly approves sync.
- Concrete guidance should reduce operator confusion, not force the agent to
  pretend it already knows files that have not been inspected yet.
- Diagnostic, evidence, and report work is valuable only when it directly
  supports a real capability, compatibility check, recovery, or release gate.

Verification:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/domain` if metadata schema or
  preferences are changed
- `npm run test --workspace @threadsmith/orchestrator` if autopilot / routing
  behavior is changed
- `npm run verify:project-truth`
- if `npm run verify:project-truth` fails because of unrelated stale state, enter
  recovery or record the blocker; do not silently proceed
- `git diff --check`
- `npm run verify:skill-sync` only after the implementation branch/change is
  accepted or merged into the control-deck source of truth and an intentional
  global sync is performed. Do not run it during ordinary implementation unless
  the operator explicitly requests a global skill sync.

## Problem Summary

Daily Progress Mode made Threadsmith much less stop-heavy, but several
operator-facing problems remain:

- next-step recommendations can still be abstract phase labels instead of
  executable actions;
- dense English protocol names still appear without plain-language translation;
- diagnostics / evidence / report slices can accumulate and crowd out real
  capability work;
- provider / integration probes can be misread as behavior-quality proof instead of
  compatibility evidence;
- evidence labels such as review, quality, behavior, and findings can sound like
  the workflow is judging product entities rather than giving developers
  observation clues;
- `.threadsmith` state maintenance can still become a standalone workflow unless
  it clearly supports the next turn;
- Threadsmith sometimes offers options when the stronger move is to recommend
  one concrete, high-value next action.

The intended shift:

```text
from: "Next phase: Provider Behavior Evidence Review v1"
to:   "Next: inspect provider output samples for repeated/stalled/forgotten
       context patterns, then update the fixture matrix and run runtime tests."
```

## Concepts

### Concrete Next Step Rule

Every operator-facing next-step recommendation, phase preview, and work-bundle
recommendation should include:

- target: the file group, module, command surface, artifact, or first inspection
  area;
- objective: the capability or decision the action will unlock;
- verification: the command, test, fixture, review check, or evidence type that
  proves the step;
- stop condition: what would require operator review before continuing.

Stop condition budget: keep stop conditions compact. When no special boundary
exists, reference standard stop gates such as public/user-facing semantics,
provider changes or default behavior changes, destructive actions, failed
verification, stale truth, or release/merge work instead of writing a long
bespoke warning every time.

If files cannot be known before inspection, say the first inspection target and
the expected edit area:

```text
下一步：
- 我会先查 runtime report builder 和对应 tests，目标是把 provider evidence
  变成可比较的样本矩阵；验证用 focused runtime tests。若发现要改变 public
  output semantics，就停下来确认。
```

Forbidden shapes:

- only a phase name;
- only "continue optimization";
- only "do evidence review";
- only "improve quality" without target, objective, and verification.

This rule does not require ordinary explanatory answers to include all four
fields. If the user asks for meaning, status, or rationale, answer that first in
plain language.

### Phase Name Translation

When a phase / slice / work-bundle name is technical or English-heavy, output
both the stable internal name and a plain-language meaning.

Required shape:

```text
Phase: Provider Behavior Evidence Review v1
人话：检查模型输出样本里有没有重复、卡住、忘记前文、或接不上输入的迹象。
```

Rules:

- keep the internal name for traceability;
- add one plain-language line in the operator's current language;
- do not translate code identifiers inside code blocks or commands;
- if a concept has been explained repeatedly in the current thread, use a short
  reminder instead of a full lecture.

### Work Type Metadata

Runtime recommendations should classify the next action by work type when
determinable:

- `capability`: changes or enables a real project capability;
- `diagnostic`: adds observation, report, fixture, probe, or evidence surfaces;
- `governance`: changes Threadsmith truth, phase state, handoff, recovery, or
  release coordination;
- `maintenance`: refactor, cleanup, formatting, dependency, or context hygiene;
- `verification`: proves an existing claim without adding product capability.

This classification should not be shown as protocol jargon by default. It is a
runtime signal used to decide whether Threadsmith is over-investing in
diagnostics or governance. Operator-facing output should not show labels such as
`workType: diagnostic` unless the user asks for debug/audit detail.

Primary work-type selection priority:

1. recovery / governance gate;
2. project capability with user-visible, operator-visible, or developer-visible
   value;
3. diagnostic supporting a named capability;
4. verification;
5. maintenance.

When a task spans multiple work types, use a short compound explanation in
developer-facing or audit contexts, but choose one primary work type for routing,
budget, and streak counting.

Legacy behavior:

- old state, fixtures, or recommendations may omit work type;
- missing work type should be inferred from context when safe;
- missing work type must not fail legacy projects or force full governance by
  itself;
- new metadata fields must be optional or have safe defaults;
- any migration for `.threadsmith` state must be documented;
- if the missing field creates real ambiguity about risk, use ordinary
  Threadsmith stop/recovery rules and explain the ambiguity.

### Diagnostic Budget

Diagnostic work is allowed when it directly supports one of:

- a named capability that will be built or validated next;
- compatibility proof for a provider / integration / platform;
- recovery from failed or contradictory evidence;
- release, audit, or ordinary regression confidence.

Named capability requirement:

- the capability must point to a concrete project ability, interface, user flow,
  validation loop, or product behavior;
- abstract labels such as "improve stability", "improve quality", "make it
  better", or "polish experience" do not count unless tied to a concrete target
  and validation loop.

Budget:

- the first and second consecutive diagnostic / report / evidence slices may
  continue when they name the supported capability;
- the third consecutive diagnostic slice must trigger either a concrete
  capability recommendation or a value checkpoint;
- if the diagnostic cannot name a supported capability, do not recommend it.

This is a soft budget, not a safety bypass. Audit / release / recovery gates may
still require more evidence. Ordinary regression confidence still counts against
the diagnostic budget; only failed regression, release gates, audit gates, or
recovery gates can override the budget.

Counter source:

- count recent consecutive work types from phase history / closeout metadata
  when available;
- otherwise use current packet or evidence summary metadata;
- do not rely on model memory as the only source;
- if no durable source exists, say the diagnostic streak is uncertain and avoid
  claiming an exact count.

Window:

- the budget applies to the current active project line, not the entire project
  history;
- within one thread, use the recent accepted slices in the current phase or work
  bundle;
- across threads or days, use committed Threadsmith truth as the source;
- reset or soften the count when the project deliberately changes track.

### Project Value Loop

Threadsmith should keep asking whether the current line of work is still moving
the project toward its own user-perceived value.

Generic value-loop authority order:

1. project-defined constitution / authority order, including AGENTS.md when
   present;
2. committed Threadsmith truth;
3. project preferences / communication profile;
4. project brief / roadmap / current phase;
5. inferred fallback wording: "user-visible value, product experience, or validation
   quality".

Value checkpoint shape:

```text
Example in Chinese because the current operator uses Chinese; actual output
should use the operator's current language.

价值检查：
- 这两轮主要在做内部诊断。它们支撑的真实能力是 <capability>。
- 我建议下一步转向 <concrete capability action>，因为它更接近当前项目价值闭环。
```

Do not hardcode Asterlea terms such as role, world, travel state, or visible
beat into Threadsmith core. Threadsmith may read and use those terms from a
project's AGENTS.md / brief / committed truth for that project, but must not bake
them into the generic skill contract.

If value sources conflict, stop for a value-source sanity check or recovery
instead of confidently recommending a capability from stale or contradictory
context. Minimal conflict signals include AGENTS.md contradicting committed
Threadsmith truth about project goals, non-goals, verification gates, or
operator-confirmation boundaries. Use a lightweight sanity check for minor
inconsistency; use recovery when the conflict is explicit, contradictory, or
execution-boundary affecting.

### Evidence Semantics

Evidence surfaces must not imply that Threadsmith is judging product entities,
characters, users, or model outputs as "correct" in-world.

Use plain semantics:

- developer observation clue;
- compatibility evidence;
- fixture / mock structural evidence;
- behavior sample;
- regression signal.

Avoid or translate dense labels when operator-facing:

- "quality finding" -> "developer observation clue";
- "behavior review" -> "looking for repeated, stalled, or context-lost output
  patterns";
- "provider probe passed" -> "the provider path is compatible for this sample;
  it does not prove stable behavior quality."

Provider evidence is one example of evidence semantics, not a requirement for
all projects. When a project uses model / provider / integration probes:

- real provider probes prove compatibility and integration health;
- fixed fixtures / mock providers prove structure and regression behavior;
- behavior quality needs a sample matrix and human-readable review criteria;
- do not treat one stochastic provider run as stable quality proof.

Direct failure rule:

- verification failures must still be called failed;
- incompatible provider / integration results must still be called incompatible;
- blocked work must still be called blocked;
- "developer observation clue" is a framing boundary, not a euphemism for real
  failure.

### Work Bundle Default

For ordinary Threadsmith work, prefer one bundle of 2-4 related actions when
all actions share the same accepted goal and risk tier.

Bundle recommendation should include:

- action 1-4 at the level of target / objective / verification, one line per
  action by default unless the operator asks for a detailed plan;
- why the actions belong together;
- the first stop gate that would break the bundle.

Do not split report field update, fixture update, focused test, context summary,
and commit into separate phases unless one introduces a real boundary.

Long-running bundle note:

- if a bundle is taking long enough that the operator would otherwise lose
  orientation, or it spans multiple verification commands, emit a lightweight
  progress update;
- examples include crossing multiple verification commands, exceeding one work
  bundle, or making several edit passes without closeout;
- this update is not a stop gate unless a real boundary appears.

### State Writeback Coupling

Threadsmith state updates should usually travel with the capability or evidence
slice they support.

Standalone `.threadsmith` updates are appropriate only when:

- committed truth is stale or contradictory;
- the next turn depends on refreshed context;
- a handoff, recovery, proposal, PR, merge, or release boundary exists;
- the operator explicitly asks for sync / status / hygiene.

Stale context handling should be proportional: minor stale context can use a
current-context refresh; contradictory or execution-affecting stale truth uses
recovery.

Otherwise, prefer final response evidence, command output, or current-context /
evidence-summary updates according to the existing writeback tier rules.

Context-only commits should be rare and must state why the context update needed
its own commit instead of traveling with a capability, evidence, recovery, PR /
merge, release, or handoff slice. A context-only commit means a commit that
changes only `.threadsmith` state, handoff artifacts, or evidence summaries; it
does not include actual skill, runtime, docs, test, or source changes.

Do not lose long-term truth while reducing writeback noise. If the next turn,
cross-thread continuation, cross-day continuation, handoff, or recovery path will
depend on the conclusion, write current-context or evidence-summary rather than
leaving the fact only in the final response.

### Opinionated Recommendation Rule

When there is one strongest next move, recommend it directly and explain why.

Use options only when:

- there is a real product direction fork;
- two paths have materially different risk / cost / value tradeoffs;
- the operator has explicitly asked to compare alternatives;
- audit or release gates require operator choice.

Default shape:

```text
我推荐 A，因为它最接近当前主线。B 可以之后做，除非你想优先改变方向。
```

Do not overstate certainty before inspection. If the repo/files/tests have not
been checked, phrase the recommendation as: "I will first inspect X, then decide
whether Y is the right edit." After inspection, give the strongest concrete
recommendation rather than hiding behind options.

Recommendation is not approval. If a stop gate exists, a strong recommendation
still requires operator approval before execution.

## Files

- Source of truth: edit `codex/skills/threadsmith/` in this repository.
  Installed global skill copy `$CODEX_HOME/skills/threadsmith/` is sync output,
  not the implementation source. On this machine `$CODEX_HOME` is typically
  `/Users/cloud/.codex`, but implementation guidance must not hardcode that path.
- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `codex/skills/threadsmith/references/role-contracts.md` if role
  completion / writeback guidance needs the new wording
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Modify: `packages/runtime/src/nextBestStepModel.ts`
- Modify: `packages/runtime/src/nextBestStep.ts`
- Modify: `packages/runtime/src/nextBestStep.test.ts`
- Modify: `packages/runtime/src/humanCenteredOutput.test.ts`
- Modify or create:
  `packages/runtime/fixtures/human-centered-output/*.json`
- Optional modify: domain preference schema if project value-loop or
  explanation-style sources need durable typed fields
- Optional modify: orchestrator if autopilot needs to preserve work-type or
  concrete-next-step metadata across role runs

## Implementation Steps

### Milestone 0. Preflight and Inventory

Confirm the baseline, then inspect current skill contracts, verifier patterns,
runtime recommendation metadata, and fixtures before editing.

Required behavior:

- confirm Daily Progress Mode v1 is present in both the repo source skill and the
  installed/global skill when the installed copy is available;
- if the installed copy does not exist or cannot be read, record
  `global sync not verifiable` and continue modifying the repo source skill; do
  not let local install state block source implementation;
- if `$CODEX_HOME` is unset, record `global sync not verifiable` for the same
  reason;
- identify existing output selection, Daily Progress Card, work bundle,
  diagnostic/value checkpoint, and role writeback rules;
- map which tests already cover next-step wording, metadata, and fixtures;
- do not mechanically modify every file in the Files section if inventory shows
  it is unnecessary.

Verification:

- no code verification required beyond documenting the edit targets and preflight
  result. At minimum, the final response must include the preflight result; phase
  evidence, implementation notes, or PR summary may also record it.

### Milestone 1. Contract and Output Behavior

Goal: fix operator-facing wording and behavior before adding deeper runtime
budget enforcement.

### 1. Add Concrete Next Step Contract

Teach the skill and action contracts that every next-step recommendation needs
target, objective, verification, and stop condition.

Required behavior:

- Progress Card `下一步` cannot be only a phase name;
- full audit `下一 phase 预览` must include the concrete action behind the phase;
- if files are unknown, name the first inspection target and expected edit area;
- stop conditions remain explicit.

Verification:

- `npm run verify:skill-contract`
- contract patterns covering target / objective / verification / stop condition
- negative fixtures or contract checks covering forbidden shapes: only a phase
  name, only "continue optimization", only "improve quality", and only
  "evidence review"

### 2. Add Phase Name Translation Rule

Add a plain-language translation line for technical phase or bundle names.

Required behavior:

- keep internal phase names for traceability;
- add one concise explanation in the operator's current language;
- avoid long re-explanations for already familiar concepts.

Verification:

- skill contract checks for phase-name translation wording;
- fixture or snapshot if existing output fixtures can cover it.

### 3. Add Educational Interrupt Rule

Teach Threadsmith that user confusion changes the response mode.

Required behavior:

- if the operator asks "什么意思", "为什么", "我没懂", "what does this mean",
  "I'm lost", "explain", "why are we doing this", or similar, explain first;
- do not immediately convert the response into an opinionated next-step push;
- do not automatically start execution after an explanation unless the operator
  has already authorized the current phase / continuous run and no new stop gate
  appears;
- after the explanation, give a concrete recommendation only if useful.

Verification:

- contract check for educational interrupt priority.

### Milestone 2. Runtime Signals and Budget Enforcement

Goal: make diagnostic/value-loop decisions deterministic enough to survive
cross-thread use without adding user-visible jargon.

### 4. Add Work Type Metadata

Extend runtime recommendation metadata with a work-type signal.

Candidate metadata:

```ts
type WorkType =
  | "capability"
  | "diagnostic"
  | "governance"
  | "maintenance"
  | "verification";
```

Required behavior:

- ordinary feature / project-capability continuation defaults to `capability`,
  including user-visible, operator-visible, developer-visible, and internal
  platform capabilities with clear project value;
- gap checks, report surfaces, probes, and evidence reviews use `diagnostic`
  unless they directly implement capability behavior;
- truth sync / handoff / recovery uses `governance`;
- test-only proof may use `verification`;
- light cleanup uses `maintenance`.
- primary work type follows the documented priority order when multiple labels
  could apply.
- missing legacy work type is inferred safely and must not fail old state.
- new metadata fields are optional or have safe defaults, and any migration is
  documented.
- work type metadata is not displayed in operator output by default.

Verification:

- runtime tests for work-type metadata on normal implementation, diagnostics,
  value checkpoint, and governance fallback.
- runtime tests for missing legacy work type.

### 5. Enforce Diagnostic Budget

Use work-type and recent metadata to avoid diagnostic chains.

Required behavior:

- repeated diagnostic / evidence / report recommendations trigger a value
  checkpoint or capability recommendation;
- diagnostic recommendations must name the capability they support;
- ordinary regression confidence counts against the diagnostic budget;
- failed regression, audit / release / recovery evidence needs can override the
  soft budget, but must explain why.
- budget overrides must name the gate or reason that justifies the override.
- if no durable counter source exists, output should not claim an exact
  diagnostic streak.

Verification:

- runtime tests for diagnostic streak budget;
- runtime tests for missing / uncertain diagnostic counter source;
- runtime tests that audit / recovery can still require evidence;
- contract check that diagnostics must name a supported capability.

### 6. Strengthen Project Value Loop

Make value checkpoint wording derive from generic project sources.

Required behavior:

- no Asterlea-specific vocabulary in Threadsmith core;
- checkpoint uses AGENTS.md / preferences / project brief when available;
- source authority order is project-defined constitution / authority order
  including AGENTS.md when present, committed Threadsmith truth, preferences,
  project brief / roadmap, then inferred fallback;
- stale or contradictory value sources trigger a value-source sanity check or
  recovery before a confident recommendation;
- fallback wording remains generic;
- checkpoint recommends one concrete next action when there is a strongest move.

Verification:

- runtime fixture for value checkpoint with generic fallback;
- runtime / contract coverage for stale value-source handling if represented in
  runtime signals;
- domain tests only if new durable preference fields are added.

### Milestone 3. Output and State Coupling

Goal: keep concrete recommendations readable, avoid context-only workflow noise,
and preserve manual execution quality when autopilot is unavailable.

### 7. Clarify Evidence Semantics

Update contracts so evidence surfaces are developer observation tools, not
product-entity judges.

Required behavior:

- real provider probe language says compatibility evidence, not stable quality
  proof when provider/integration probes exist;
- mock / fixture language says structural or regression evidence;
- behavior-review wording translates to concrete observation patterns;
- failed / incompatible / blocked evidence remains direct and unsoftened;
- output avoids "quality裁判" style claims unless the project explicitly defines
  a QA rubric.

Verification:

- skill contract checks for provider compatibility disclaimer and developer
  observation wording;
- runtime fixture update if recommendation metadata exposes evidence semantics.

### 8. Make Work Bundle Recommendations More Concrete

Extend work bundle guidance so Threadsmith names the 2-4 related actions instead
of only saying "continue current work bundle".

Required behavior:

- bundle recommendations include action targets and verification;
- bundle budget still stops at one bundle / 2-4 related actions;
- long-running or multi-verification bundles emit lightweight progress updates
  without becoming stop gates;
- public / provider / release / destructive / failed-verification gates still
  interrupt bundles immediately.

Verification:

- runtime tests for bundle metadata and budget;
- contract checks for bundled action shape.

### 9. Couple State Writeback To Useful Continuity

Refine state writeback guidance so standalone `.threadsmith` work remains rare.

Required behavior:

- standalone state updates require stale truth, next-turn dependency, handoff,
  recovery, proposal, PR / merge / release boundary, or explicit sync request;
- ordinary state updates should be bundled with the capability / evidence slice;
- current-context or evidence-summary is required when the next turn,
  cross-thread, cross-day, handoff, or recovery path depends on the conclusion;
- context-only commits are rare and must state why the state update needed its
  own commit;
- final output should not foreground state maintenance unless it changes the
  next action.

Verification:

- contract checks for standalone state update conditions;
- role-contract update if role packet guidance changes.

### 10. Add Opinionated Recommendation Guidance

Teach Threadsmith to recommend the strongest next move instead of offering
options by default.

Required behavior:

- recommend one action when value/risk evidence clearly points to it;
- offer alternatives only for real forks or explicit comparison requests;
- explain why the recommended action is closest to the project value loop;
- do not treat recommendation as operator approval when a stop gate exists;
- if repo/files/tests have not been inspected, name the first inspection target
  instead of pretending the exact edit is already known.

Verification:

- contract checks for opinionated recommendation wording;
- runtime test or fixture for value checkpoint selecting one recommended action;
- fixture or contract check that the recommendation includes a value/risk reason.

### 11. Preserve Concrete Loop Without Autopilot

Keep the same concrete value-loop behavior when autopilot / orchestrator is not
available.

Required behavior:

- manual Threadsmith drive/continuous execution still uses concrete next-step,
  value-loop, diagnostic budget, and work-bundle rules;
- unavailable autopilot must not cause fallback to abstract phase labels;
- if existing command capability detection shows autopilot is unavailable, output
  should say the execution is manual;
- this plan does not require building a new command capability detection system
  solely for this fallback.

Verification:

- contract check for manual fallback wording;
- orchestrator tests only if command capability detection or autopilot routing is
  changed.

## Acceptance Criteria

- Threadsmith recommendations, Progress Cards, work-bundle guidance, and phase
  previews include target, objective, verification, and stop condition, or
  clearly name the first inspection target when files are not yet known.
- Ordinary explanation answers can stay shorter and should explain first when
  the operator is confused; explanation-only answers do not automatically start
  execution unless continuation is already authorized.
- Technical phase / bundle names are accompanied by plain-language meaning.
- Diagnostic / evidence / report work cannot chain indefinitely without naming
  the capability it supports, and diagnostic streaks are counted from durable
  Threadsmith sources rather than model memory.
- The third consecutive diagnostic slice triggers a concrete capability
  recommendation or value checkpoint.
- Diagnostic budget override names the gate or reason.
- Operator-facing output does not show `workType` or similar metadata by
  default.
- Diagnostic streak count also does not appear as protocol metadata by default;
  it is explained in plain language only when it affects a capability/value
  checkpoint recommendation.
- Missing legacy work-type metadata is inferred or handled safely.
- New metadata fields are optional or have safe defaults, and migrations are
  documented.
- Value checkpoints use generic project value-loop sources and do not hardcode
  Asterlea-specific terms.
- Project value-loop source conflicts trigger sanity-check / recovery behavior.
- Provider probes are described as compatibility evidence, not behavior quality
  proof when provider/integration probes exist.
- Evidence review language is framed as developer observation clues, not
  product-entity judgment.
- Failed, incompatible, or blocked evidence is still stated directly.
- Work bundles remain 2-4 related actions and include concrete action targets.
- Standalone `.threadsmith` updates are reserved for real continuity,
  recovery, handoff, sync, PR / merge, or release needs.
- Threadsmith recommends one strongest next move by default and uses options
  only for real forks, with a value/risk reason for the recommendation.
- Recommendation is not treated as operator approval when a stop gate exists.
- Context-only commits are rare and require a reason.
- Old abstract recommendation shapes are rejected by a passing fixture or
  contract check, and new concrete recommendation shapes pass.
- Skill contract and runtime tests protect the new rules.

## Risks

- Over-concretizing next steps could make Threadsmith hallucinate file names
  before inspection.
- Diagnostic budget could undercut legitimate audit / recovery evidence needs.
- Opinionated recommendations could feel too forceful when a product choice is
  genuinely open.
- Project value-loop wording could become stale if project brief / AGENTS.md is
  stale.
- Evidence semantics could become euphemistic if it hides real failures instead
  of naming them clearly.
- Work-type classification drift could misroute recommendations when a task is
  both diagnostic and capability-enabling, or when maintenance changes behavior.

Mitigations:

- Allow "first inspection target + expected edit area" when exact files are not
  known.
- Let audit / recovery / release gates override diagnostic budget with an
  explicit reason.
- Keep options for real product forks and operator-requested comparisons.
- Prefer committed project sources but mention when value-loop language is
  inferred.
- Use plain failure language for developer evidence while keeping it outside
  product/world causality.
- Split implementation into contract/output behavior and runtime budget
  enforcement milestones so failures are easier to localize.
- Allow a short compound explanation when work spans multiple types, but choose
  one primary work type for routing and budget decisions.

## Done When

- Skill, action, runtime, and role contracts describe concrete next steps,
  phase-name translation, diagnostic budget, evidence semantics, and value-loop
  behavior consistently.
- Runtime recommendation metadata and tests cover work type, diagnostic budget,
  value checkpoint, bundle concreteness, and provider/evidence semantics where
  implemented.
- Contract verifier protects the new operator-facing rules.
- The final response includes one before/after sample showing an old abstract
  recommendation and the new concrete recommendation shape. Use generic project
  wording unless the fixture explicitly represents a project-specific context.
- Applicable verification commands pass.
- The final response states whether global skill sync happened. It should not
  happen until the implementation branch/change is accepted or merged into the
  control-deck source of truth unless explicitly requested.
- Source implementation can be complete without global skill sync when sync was
  not approved; the final response should say so rather than forcing sync to
  satisfy Done When.
