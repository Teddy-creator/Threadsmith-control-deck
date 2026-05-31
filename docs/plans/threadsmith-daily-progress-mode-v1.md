# Threadsmith Daily Progress Mode v1 Implementation Plan

Goal: make everyday Threadsmith use feel like a lightweight development
partnership instead of repeated audit closeouts, while preserving strict
governance for real boundaries.

Scope: add a daily progress mode for small and medium work, define a compact
Progress Card output, support work bundles and rolling closeout, reduce routine
role packet writeback, and make value / engineering-depth checkpoints more
visible without hardcoding any single project.

Non-goals: Asterlea-specific wording, removing audit mode, removing committed
truth, weakening release / provider / destructive / user-public gates, changing
global skill installation during implementation, or redesigning the frontend.

Assumptions:

- The baseline includes Human-Centered Governance v1 and Noise Reduction /
  Operator Comfort v1.
- Full audit output remains necessary for release, merge, destructive actions,
  provider defaults, cross-agent state, recovery, public behavior, and major
  architecture boundaries.
- Daily progress mode should be generic. Project-specific value language comes
  from AGENTS.md, project preferences, or project brief.
- The fix should reduce operator-facing ceremony and durable writeback noise,
  not hide important evidence.

Verification:

- `npm run verify:skill-contract`
- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/runtime`
- `npm run test --workspace @threadsmith/orchestrator`
- `npm run verify:project-truth`
- `git diff --check`
- `npm run verify:skill-sync` only after an intentional global skill sync

## Problem Summary

Threadsmith is now safer and more continuous than earlier versions, but the
default experience is still too audit-shaped for daily development.

Observed failures:

- small slices receive full closeout skeletons;
- related micro-actions become separate phases;
- phase boundaries create a stop feeling even after the operator authorized
  continued work;
- `.threadsmith` writeback still touches too many files during ordinary work;
- role packets repeat the same facts across planner / executor / reviewer /
  verifier / closeout;
- next-phase previews can create local inertia instead of asking whether the
  next engineering depth is still highest value.

The intended shift:

```text
from: every accepted phase gets a full audit-style closeout
to: ordinary work gets a compact progress card; real boundaries get audit output
```

## Concepts

### Daily Progress Mode

Daily progress mode is the default operator-facing output mode for low-risk
`light-repair` and ordinary `normal-implementation` work.

Use it when all are true:

- the work is inside an already approved scope;
- no public/user-facing semantics changed;
- no provider defaults, credentials, release, destructive action, real user
  data, or cross-agent state changed;
- verification is narrow or standard;
- the next action belongs to the same work bundle or a clearly approved
  continuation.

Do not use it when:

- full-governance is selected;
- a PR / merge / release / tag is created;
- a cross-thread / cross-agent handoff is needed;
- recovery from stale or contradictory truth is active;
- the operator asks for an audit-style report;
- the next action requires a new route, scope, or product decision.

CLI/docs distinction:

- developer-only local CLI / docs / harness work may use Daily Progress when it
  is local, reversible, clearly non-public, and inside the approved scope.
- user-public CLI / docs / API, compatibility behavior, published docs, or
  public support promises must use audit output.

Output selection precedence:

1. recover / audit gates and hard stop conditions;
2. explicit operator request for full audit, or direct explanation without
   execution;
3. explicit compact answer request, only when no hard safety / recover / audit
   gate is active;
4. daily progress eligibility;
5. ordinary sync / drive / continuous output defaults.

### Progress Card

Default daily output should use this compact shape:

```text
本轮完成：
- 新增/修复了什么能力。

关键改动：
- 只列关键代码、文档、测试或命令。

验证：
- 跑了什么，结果是什么。
- 没跑什么，有什么风险。

记录状态：
- `updated` / `unchanged` / `skipped`，只用一行说明，且只在 writeback status 对理解有帮助时出现。

下一步：
- 建议做什么。
- 为什么现在做它。
- 什么情况需要停下来问你。

需要你决定：
- 只有真正改变路线、边界、验收、真实数据、provider、发布或破坏性操作时才出现。
```

Rules:

- Omit `需要你决定` when there is no real decision.
- Do not include `Threadsmith Decision` in daily progress output.
- Do not expose role / packet / truth vocabulary unless needed for clarity.
- Mention the writeback tier only when it explains why few files changed.
- If the work changed only internal foundations, say it is not user-visible yet.

### Audit Output

Use full audit output only for:

- architecture boundary changes;
- user-public behavior, public API / CLI / docs, published docs, or
  compatibility behavior;
- provider default, credential, release, merge, tag, destructive, or migration
  work;
- real user data or privacy-sensitive behavior;
- cross-agent / cross-thread handoff;
- stale truth recovery, major failed verification recovery, or proposal
  adoption;
- explicit operator request for a full report.

Audit output may keep the human-first full skeleton from the current
Threadsmith contract. Daily progress mode should not use that skeleton.

### Work Bundle

A work bundle groups 2-4 related actions under one accepted direction.

Examples:

- report builder + sample CLI + focused test;
- small runtime helper + direct consumer update + narrow verification;
- docs clarification + contract check + one fixture update.

Allowed when:

- all actions affect the same subsystem and same accepted goal;
- no new user-public semantics, provider default, real user data, release,
  destructive action, or cross-agent state is introduced;
- verification can remain narrow or standard;
- one progress card can explain the whole bundle without hiding risk.

Not allowed when:

- actions cross unrelated subsystems;
- one action requires operator decision;
- verification failure makes the repair path unclear;
- a new product / public / release / provider / destructive boundary appears.

### Rolling Closeout

Rolling closeout is a closeout shape for "keep going" sessions. It reports the
work just completed but does not turn the next internal continuation into a new
approval point.

Allowed when:

- the operator has explicitly authorized continuous progress;
- the next action remains inside the same work bundle or approved direction;
- no audit stop appears;
- verification evidence is sufficient for the completed sub-step.

Budget:

- rolling closeout may continue for at most one work bundle, or 2-4 related
  actions, before emitting a lightweight value checkpoint;
- after that checkpoint, continue only if the next action is still inside the
  same approved direction and no hard stop appears.

Stop instead when:

- the next action changes route, scope, product semantics, real data,
  provider, release, destructive behavior, or public surface;
- verification failed and the repair path is not clear;
- truth is stale or contradictory;
- the next action would require a new plan rather than continuing the bundle.

### Role Packet Sparsening

Role packets should be durable collaboration artifacts, not routine duplicated
summaries.

Default daily behavior:

- do not rewrite planner / executor / reviewer / verifier / closeout packets
  for ordinary progress cards;
- use current context or evidence summary for daily continuity when the next
  turn needs durable context;
- final response and command output are useful evidence display, but are not
  durable truth by themselves;
- mark role packets stale only when their role-relevant truth actually changed.

When skipping role packets:

- update current-context or evidence-summary when the skipped packet would
  otherwise be needed for the next action;
- treat it as needed when the next step depends on this round's conclusion,
  the next step continues the same bundle across turns, the work may continue
  cross-thread or cross-day, or this round changed scope, verification, stop
  condition, blocker, or route;
- for `evidence-only` work that does not affect the next step, it is acceptable
  to leave no `.threadsmith` writeback;
- explain skipped role packets only when omission could confuse the operator,
  not in every daily progress card.

Generate or refresh full role packets only for:

- handoff to another thread or agent;
- recovery from stale / contradictory context;
- full-governance audit boundary;
- cross-agent state bridge work;
- release / public documentation / major architecture decisions;
- explicit operator request.

### Value and Engineering-Depth Checkpoint

Threadsmith should prevent local engineering inertia without forcing constant
operator meetings.

Trigger:

- after 3-5 internal-only or governance-heavy accepted slices without a value
  checkpoint;
- after repeated gap checks;
- after the same subsystem receives several consecutive internal-only bundles;
- when next-step recommendations keep deepening the same internal layer.

Output:

- use a short daily progress note, not an audit report;
- ask whether the next work should continue engineering depth or shift toward
  product/user value;
- use project-configured value language from AGENTS.md/preferences/project
  brief;
- if no project wording exists, use a neutral fallback question: "continue
  engineering depth, or shift toward user-visible value, product experience, or
  validation quality?"
- allow the operator to skip without resetting the whole workflow.

Counter source:

- prefer phase history or closeout metadata when available;
- otherwise use current packet / evidence summary metadata;
- do not rely on model memory as the only counter source.

### Gap Check Budget

Gap checks should produce a direct implementation decision.

Rules:

- a gap check must end with one of: implement now, stop for operator decision,
  run focused verification, or recover stale truth;
- if it chooses `implement now`, it must name the next file, module, command, or
  test-level action. It must not only say "continue optimization";
- if it cannot produce a concrete next action, it was too early or too broad;
- do not chain another gap check unless new material evidence appeared;
- after a gap check chooses an implementation path, the next normal action
  should be implementation.

### Verification Tiers

Verification should match risk:

- docs-only: `git diff --check`; run markdown parse only if the repo already
  has an available command; run `jq` when JSON changed;
- skill contract copy: `npm run verify:skill-contract`;
- runtime metadata / recommendation model: targeted runtime tests plus full
  runtime workspace tests when model types changed;
- domain preferences/schema: domain tests;
- orchestrator / autopilot behavior: orchestrator tests;
- release / launcher / public sync: CI and release-specific checks.

Threadsmith should explain why a verification level was chosen only when the
operator would otherwise be surprised.

## Files

- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/role-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Modify: `packages/runtime/src/nextBestStepModel.ts`
- Modify: `packages/runtime/src/nextBestStep.ts`
- Modify: `packages/runtime/src/nextBestStep.test.ts`
- Modify: `packages/runtime/src/humanCenteredOutput.test.ts`
- Modify or create: `packages/runtime/fixtures/human-centered-output/*.json`
- Optional modify: runtime metadata model files if Daily Progress needs
  explicit fields. Prefer existing project-status, phase history, current
  packet, or evidence-summary metadata over a new persistent metadata file.
- Optional modify: `packages/orchestrator/src/*` only if rolling closeout or
  command capability detection has an orchestrator representation.
- Optional modify: `packages/fs-bridge/src/*` only if role packet sparsening or
  writeback tier enforcement must happen at fs-bridge write time.
- Optional create: `docs/reports/threadsmith-daily-progress-mode-v1-closeout.md`
  only if this change needs durable audit evidence. Ordinary daily-mode work
  should not create reports by default.

## Implementation Steps

### 1. Add Daily Progress Output Contract

Add daily progress mode to the skill/action contracts and verifier.

Required behavior:

- daily progress output uses the compact Progress Card;
- audit output keeps the full human-first skeleton;
- `Threadsmith Decision` is not shown in daily progress output;
- `需要你决定` appears only for real decisions.
- daily progress output still includes next step and stop condition.
- writeback status line appears only when durable writeback changed or omission
  could confuse the operator.

Verification:

- `npm run verify:skill-contract`
- fixtures covering daily card vs audit output selection.

### 2. Add Work Bundle Rules

Teach Threadsmith when related actions should remain one bundle instead of
becoming several tiny phases.

Required behavior:

- group 2-4 same-subsystem actions under one accepted direction;
- audit stops still interrupt bundles;
- gap checks and docs-only work can join a bundle only when they directly
  support the same executable action.

Verification:

- runtime tests for work bundle continuation;
- runtime tests for audit stop breaking a work bundle.

### 3. Add Rolling Closeout Budget

Teach Threadsmith when to report progress and continue without turning the next
internal continuation into a new approval point.

Required behavior:

- rolling closeout continues only when the next step remains inside the bundle;
- rolling closeout stops after one bundle or 2-4 related actions for a
  lightweight value checkpoint;
- audit stops still interrupt rolling closeout immediately.

Verification:

- runtime tests for rolling closeout continuation;
- runtime tests for rolling budget exhaustion producing value checkpoint.

### 4. Harden Role Packet Sparsening

Make role packet writes opt-in by durability.

Required behavior:

- daily progress does not rewrite five role packets;
- role packets refresh only for handoff, recovery, full-governance, cross-agent
  work, release/public docs, major architecture decisions, or explicit request;
- if role packets are not refreshed, current-context or evidence-summary must
  carry next-turn facts when they are needed;
- the final output explains skipped packets only when omission could confuse
  the operator.

Verification:

- contract checks for role packet sparsening;
- fs-bridge tests only if writeback enforcement is implemented there.

### 5. Strengthen Value / Engineering-Depth Checkpoint

Make value checkpoint more visible after internal-only work, without hardcoding
Asterlea.

Required behavior:

- detect repeated internal-only or governance-heavy work from available
  metadata;
- emit a short value checkpoint using project-configured wording;
- allow skip/continue without turning it into a full audit phase.

Verification:

- runtime fixture for repeated internal-only bundles triggering value checkpoint;
- preference / metadata tests if new fields are added.

### 6. Tighten Gap Check Budget

Require gap checks to produce implementation, stop, verification, or recovery.

Required behavior:

- gap check output must name the next executable action or stop condition;
- if the result is `implement now`, it must include file, module, command, or
  test-level next action detail;
- no gap-check chaining unless new material evidence appears;
- after gap check selects a path, implementation should be next.

Verification:

- runtime tests for gap-check-to-implementation flow;
- contract checks preventing vague gap-check output.

### 7. Align Verification Tiers With Daily Mode

Document and test risk-based verification expectations.

Required behavior:

- docs-only and small contract changes do not imply full runtime tests;
- runtime model/schema changes still run relevant package tests;
- audit/release/public changes still run broader checks.

Verification:

- contract checks for verification tiers;
- no broad test runner changes unless existing code needs it.

## Acceptance Criteria

- Daily small/medium work defaults to Progress Card output, not full audit
  skeleton.
- Daily Progress Card still contains next step and stop condition.
- Daily output does not show `Threadsmith Decision`.
- Full audit output still appears for real boundaries.
- Developer-only local CLI/docs can use Daily Progress; user-public CLI/docs
  still use audit output.
- Work bundles can group related small actions without hiding scope or risk.
- Rolling closeout continues inside an approved bundle, stops at real gates, and
  cannot exceed one bundle / 2-4 related actions without a value checkpoint.
- Daily work does not rewrite role packets by default.
- Skipping role packets still leaves current-context/evidence-summary when the
  next turn needs durable context.
- Gap checks must end in implement / stop / verify / recover.
- Value checkpoint appears after repeated internal-only or governance-heavy
  work and uses project-configured language.
- Verification guidance is risk-tiered and does not over-test docs-only work.
- Contract checks protect the new daily-vs-audit split.
- No Asterlea-specific wording is hardcoded into Threadsmith core.

## Risks

- Making daily output too light could hide evidence needed for recovery.
- Work bundles could accidentally group unrelated actions.
- Rolling closeout could feel like continuing without consent if the next step
  is outside the approved direction.
- Role packet sparsening could weaken cross-agent handoff if no substitute
  context is available.
- Daily mode could make the operator think no durable writeback happened even
  when truth changed, or vice versa.

Mitigations:

- Keep full audit output for real boundaries.
- Use explicit work-bundle stop conditions.
- Preserve current-context/evidence summary when role packets are skipped.
- Require handoff/recovery/cross-agent work to refresh durable packets.
- Progress Card should include one compact writeback line only when writeback
  status matters: `记录状态: updated`, `记录状态: unchanged`, or
  `记录状态: skipped`.

## Done When

- Skill, action, role, and runtime contracts describe daily progress mode
  consistently.
- Runtime tests cover daily card, work bundle continuation, rolling closeout
  budget, audit stop, role packet sparsening, value checkpoint, and gap-check
  budget behavior.
- Contract fixtures cover Progress Card shape, optional writeback status line,
  and omitted `Threadsmith Decision` in daily output.
- Verification commands pass.
- The final response states whether global skill sync happened. It should not
  happen until after merge unless explicitly requested.
