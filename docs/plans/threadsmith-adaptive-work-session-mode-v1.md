# Threadsmith Adaptive Work Session Mode v1 Implementation Plan

Goal: make Threadsmith useful as a general project governance layer without making solo or small-team development feel over-fragmented, over-documented, or phase-bound at every tiny action.

Scope: introduce a generic adaptive work-session policy that can group related small actions, reduce unnecessary phase boundaries, tier closeout output, limit gap-check loops, and preserve truth/verification where risk actually justifies it.

Non-goals: Asterlea-specific rules, project-specific hardcoding, frontend redesign, multi-provider routing, release automation, removal of review/verification gates, or weakening destructive-action and scope-change safety stops.

Assumptions: Threadsmith should remain a safety belt and state store, not the product direction owner. The same mechanism should work for code projects, creative-engineering projects, docs-heavy projects, and later multi-agent projects.

Verification: implementation should use the smallest verification tier that matches the touched surface, then run final contract/truth checks before completion.

Verification should be tier-aware:

- `lite`: focused tests, contract checks, parse checks, or `git diff --check` for low-risk local work.
- `standard`: package or workspace tests that cover the changed subsystem.
- `audit`: full project truth checks plus release, launcher, public docs, provider, security, or cross-agent checks when those surfaces are touched.

This implementation plan final closeout still requires `npm run verify:skill-contract`, relevant package tests, `npm run verify:project-truth`, and `git diff --check`. Do not run the full suite after every `lite` work session unless the touched surface or failure evidence justifies it.

Expected final commands for this implementation plan: `npm run verify:skill-contract`, `npm run test --workspace @threadsmith/domain`, `npm run test --workspace @threadsmith/runtime`, `npm run test --workspace @threadsmith/orchestrator`, `npm run verify:project-truth`, and `git diff --check`.

Run `npm run verify:skill-sync` only when this implementation intentionally syncs the repository skill to the installed global skill. Otherwise, use `verify:skill-contract` to protect the repo skill contract without mutating or requiring global sync.

## Problem Summary

Threadsmith currently controls boundaries, verification, truth writeback, and closeout well, but it can over-apply full governance to small solo-development moves. The resulting failure mode is not incorrectness; it is operator fatigue:

- phases become too small;
- closeouts become too frequent;
- gap checks can become action prelude loops;
- documents grow faster than product capability;
- the next step can become locally optimal rather than product-value optimal;
- context packets can become dense history containers instead of current operating packets.

The fix should be a generic operating-mode adjustment, not an exception for one project.

## Files

- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `codex/skills/threadsmith/references/runtime-contract.md`
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Modify: `packages/runtime/src/nextBestStep.ts`
- Modify: `packages/runtime/src/nextBestStep.test.ts`
- Modify: `packages/runtime/src/contextBudget.ts`
- Modify: `packages/runtime/src/contextBudget.test.ts`
- Modify: `packages/domain/src/preferences.ts`
- Modify: `packages/domain/src/preferences.test.ts`
- Optional modify: `packages/orchestrator/src/plannerMode.ts`
- Optional modify: `packages/orchestrator/src/plannerMode.test.ts`
- Create: `docs/reports/adaptive-work-session-mode-v1-closeout.md`

## Concepts

### Work Session

A work session is a bounded group of related actions inside the current phase. It does not replace the phase, and it must not silently expand the phase contract.

Examples:

- extract a module, add focused tests, update the direct consumer, and close out once;
- draft a plan, implement the narrow slice, verify, and summarize once;
- inspect a risk, fix the smallest confirmed issue, and record the result once.

A work session is larger than a micro-phase and smaller than an open-ended epic. It may include multiple role gates or related actions, but durable phase/truth writeback should happen at the session boundary unless a real stop gate appears.

Use a work session when all are true:

- the operator has accepted the current direction;
- the next 2-4 actions affect the same subsystem and accepted goal;
- no unapproved new user-visible capability, consumer surface, product semantics change, provider default, credential, release, or destructive action is introduced;
- verification can remain focused or standard;
- truth can be written once at the session boundary without losing auditability.

Do not use a work session when:

- the next action changes product semantics;
- the next action exposes a new consumer surface;
- the next action changes provider, credential, release, or destructive behavior;
- repo evidence contradicts committed truth;
- verification failed and the repair path is uncertain.

Related examples:

- related: extract a module, add focused tests, update the existing direct consumer, and close out once;
- not related: extract a module, add an HTTP route, change frontend behavior, and change provider defaults in the same session.

Strong stop examples:

- new consumer surface: introducing a new UI route, API endpoint, CLI command, or public integration path;
- new product semantics: changing what the user sees, what a model response means, or how a workflow is interpreted;
- provider default: changing which model/provider runs by default, adding live credentials, or changing fallback behavior;
- release/destructive action: tag, publish, merge, public sync, delete, reset, migration, or irreversible file/data operation.

### Truth Writeback Shape

Work sessions should preserve durable truth without turning each internal action into a separate phase.

At work-session start:

- do not create a new phase only to name the session;
- record the selected work-session target in active work or the current packet only if it changes execution behavior or helps avoid repeated recommendations.

During the session:

- keep internal notes as run evidence, command output, or local reasoning unless a real stop gate appears;
- write durable truth immediately only for blockers, failed verification, scope changes, or user decisions.

At work-session closeout:

- update acceptance state when done-when evidence changed;
- update active work when role ownership, blocker state, or next action changed;
- update evidence summary or current packet when the next operator turn needs the new fact;
- refresh role packets or mark them stale when role-relevant truth changed;
- avoid preserving every internal sub-step as active truth when the final session result already captures it.

Before coding, map these writeback rules to concrete runtime keys and files so implementation does not invent new truth surfaces implicitly.

### Closeout Tiers

Threadsmith should select the smallest closeout tier that preserves orientation and safety:

- `lite`: small or low-risk work; summarize change, verification, and next natural stop only.
- `standard`: normal bounded implementation work; include phase result, changed capability, verification, risks, and next phase preview.
- `audit`: release, PR/merge, public docs, destructive operations, architecture boundaries, provider routing, security, or cross-agent state.

Full skeleton output should become `audit` or major `standard`, not the default for every tiny phase.

Closeout tier templates:

`lite`:

- required changed:
- required verification:
- required truth: `updated`, `unchanged`, or `skipped with reason`
- required next:
- optional risk: write `none` when no material risk remains

`standard`:

- required result:
- required changed capability:
- required verification:
- required truth:
- required remaining risk:
- required next phase:

`audit`:

- use the full Threadsmith Output Contract skeleton.

### Gap Check Budget

Gap checks should prevent wrong work, not replace work. A work session should not chain gap checks unless a new material unknown appears.

Default rule: one gap check per work session unless:

- committed truth contradicts repo evidence;
- verification fails;
- scope or product direction changes;
- the next step would affect release, destructive actions, provider routing, or public behavior.

If a gap check has already selected the next implementation path, the next normal action should be implementation, not another gap check, unless verification failed, scope changed, release/destructive/public risk appeared, or committed truth contradicts repo evidence.

### Product / User-Value Heartbeat

Every few governance-heavy sessions, Threadsmith should recommend a lightweight value check:

- did the project become more usable, playable, understandable, reliable, or closer to its stated product goal?
- is the next local engineering step still the highest-value direction?
- should the operator choose between engineering depth, product surface, architecture map, or creative/UX validation?

This must be generic. For a code library, the heartbeat may ask about API usability. For a creative project, it may ask about product feel. For a CLI tool, it may ask about operator flow. It is a recommendation surface, not a mandatory ritual.

The heartbeat only reminds the operator to reassess value. It must not rewrite current acceptance, force a direction change, or interrupt an accepted implementation path unless a real stop gate appears.

Deterministic trigger for v1: after three consecutive governance-heavy accepted sessions without a value heartbeat, recommend one at the next phase boundary or work-session closeout. For v1, count accepted `standard` or `audit` closeouts from phase history or closeout tier evidence as governance-heavy; `lite` closeouts do not increment the counter. Reset the counter when the operator performs, accepts, or explicitly skips the heartbeat.

### Governance Intensity Preference

Governance intensity should be configurable without project-specific rules:

- options: `light`, `standard`, `audit-heavy`;
- default: `standard`;
- source: explicit user instruction for the current operator invocation or work session, `.threadsmith/preferences.json`, and project `AGENTS.md`;
- lifecycle: invocation-level instructions expire after the current response or work session; `.threadsmith/preferences.json` persists across sessions; `AGENTS.md` applies as durable project constitution;
- priority: non-negotiable safety gates from the skill contract or `AGENTS.md` win first; explicit user instruction can override ordinary project defaults; `.threadsmith/preferences.json` provides the durable project default; `AGENTS.md` may provide additional soft defaults when they do not conflict with preferences;
- invariant: audit stop gates cannot be downgraded by preference.

Use the existing preferences surface for v1. Do not introduce a new governance state file only for intensity.

### Context Packet Current-State Budget

The current Context Packet should stay current-state oriented by default:

- current goal;
- recent 3-5 accepted slices or decisions;
- current open risks and blockers;
- next best step or current work-session target;
- latest failed verification or high-signal evidence.

Older history should move to archived evidence, phase history, or reports instead of staying in the active packet. Compact only at work-session closeout or when the context budget is exceeded, not in the middle of an accepted implementation path.

## Steps

1. Add a `work-session` concept to the Threadsmith skill contract.
   - Outcome: the global instructions distinguish `phase`, `slice`, `role gate`, and `work session`.
   - Check: `verify-threadsmith-skill-contract` asserts the new concept exists and preserves stop gates.

2. Add cadence rules for grouping related small actions.
   - Outcome: short approvals such as "同意，请使用 Threadsmith 推进" can resolve to a work-session continuation until a natural stop, instead of a single micro-phase, unless the user explicitly requests one role or one action.
   - Check: skill contract includes examples for grouped implementation, single-role drive, and stop-gate fallback.

3. Add closeout tier selection.
   - Outcome: Threadsmith can choose `lite`, `standard`, or `audit` output according to risk and boundary level.
   - Check: contract tests verify full skeleton is still required for audit events, while small accepted work may use lite closeout; tier-specific templates are documented.

4. Add gap-check budget rules.
   - Outcome: Threadsmith avoids chaining gap checks by default and explains when another gap check is justified.
   - Check: runtime or skill-contract tests include "gap check after gap check" and "gap check after failed verification" cases.

5. Add product/user-value heartbeat guidance.
   - Outcome: after repeated engineering-governance phases, Threadsmith recommends a lightweight value review rather than blindly continuing local technical depth.
   - Check: tests or contract fixtures show the three-session trigger, and that the heartbeat is advisory and does not override explicit user direction.

6. Add or update preferences for governance intensity.
   - Outcome: projects can prefer `light`, `standard`, or `audit-heavy` governance without project-specific hardcoding.
   - Check: domain preferences parse and default safely; audit stop gates cannot be downgraded by preferences.

7. Update context budget guidance.
   - Outcome: current packets should prioritize active facts, recent decisions, open risks, and next horizon rather than accumulating unlimited history.
   - Check: context budget tests protect high-signal recent evidence and avoid forcing all historical facts into the current packet.

8. Update runtime next-best-step behavior only where deterministic and testable.
   - Outcome: runtime recommendations can label a next move as `work-session-continue`, `gap-check`, or `value-heartbeat` when evidence supports it, while output tier remains a separate presentation decision.
   - Check: `nextBestStep` tests cover at least one low-risk continuation, one audit-required stop, one gap-check budget case, and one value-heartbeat recommendation. Runtime should only emit labels derivable from state/history; wording, closeout tier templates, and operator-facing phrasing stay in the skill contract.

9. Keep autopilot and manual drive compatible.
   - Outcome: adaptive work-session mode should work whether the chain is run through autopilot or manually driven by the current agent.
   - Check: orchestrator tests do not require every adaptive session to produce `phase-runs`, but autopilot runs should still produce runtime timing artifacts.

10. Write a required closeout report that explains the new operator-facing behavior.
    - Outcome: future users can understand when Threadsmith is acting as safety belt, workflow driver, or audit gate.
    - Check: closeout report includes non-goals and examples that are not tied to a single project.

## Acceptance Criteria

- Threadsmith can group 2-4 related small actions into one work session when risk is low and the operator has approved the direction.
- Threadsmith does not require full skeleton closeout for every small accepted slice.
- Threadsmith still stops for real gates: scope change, failed verification, destructive actions, release actions, stale truth, provider credentials, or cross-agent state risk.
- New consumer surfaces and product semantics changes cannot be bundled into a work session without explicit operator approval.
- Gap checks no longer chain by default.
- A generic value heartbeat exists and is not Asterlea-specific.
- Context packet guidance becomes shorter and more current-state oriented.
- Existing review, verification, closeout, and truth-writeback guarantees remain intact.

## Risks

- Making Threadsmith lighter could accidentally weaken safety boundaries.
- Closeout tiering could become vague if risk signals are not explicit.
- Work sessions could become too broad if "2-4 related actions" is treated as permission for open-ended implementation.
- Product/user-value heartbeat could become another ritual if it is too frequent or too verbose.
- Runtime behavior and skill prompt behavior could diverge unless tests cover both.
- Work sessions could incorrectly merge product-direction, design/research, and implementation decisions into one pass. Mitigation: product semantics, new user-visible capability, public interface, provider defaults, release, destructive actions, or uncertain repair paths must stop the session.

## Stop Conditions

- Any change would allow executor to skip reviewer/verifier/closeout gates.
- Any change would allow destructive git, release, provider, credential, or public-sync actions without an explicit stop.
- Any change would allow new consumer surfaces or product semantics changes to be bundled into a work session without explicit operator approval.
- The design starts adding project-specific examples as hard rules.
- The plan requires frontend changes or multi-provider routing to be useful.

## Done When

- The skill contract describes adaptive work sessions, closeout tiers, gap-check budget, and value heartbeat clearly.
- Contract verification protects the new behavior.
- Runtime/domain tests cover deterministic parts of the behavior.
- Existing tests and project truth verification pass.
- The final report explains how this changes day-to-day Threadsmith usage in plain language.
