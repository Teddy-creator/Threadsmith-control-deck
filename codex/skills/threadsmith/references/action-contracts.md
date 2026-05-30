# Action Contracts

Threadsmith v2 supports four supervisor modes plus deck-facing actions.

All execution-like actions first run Project Charter Gate unless the user
explicitly bypasses it for low-risk exploratory work.

## Decision Ladder

Use this ladder before choosing an action:

1. Recover: interruption, stale truth, failed verification, stuck run,
   contradiction, confusing state, or bad handoff selects `recover`.
2. Acknowledgement: a short approval after a concrete recommendation inherits
   the prior mode / role / action and must execute or report a blocking gate.
3. Project Charter Gate: execution-like work stops on failed charter status
   unless an explicit low-risk read-only bypass applies.
4. Mode: use the Execution Cadence Selector. Prefer state-based cadence over
   wording-only cadence.
5. Role chain: choose the next required role from current truth and role packet
   freshness, then decide whether it is an internal gate in an already-approved
   phase.
6. Output: use the smallest output level that still orients the operator.

Gate handling:

- `pass`: continue normally
- `warn`: continue only for read-only or low-risk work and report missing guidance
- `fail`: stop implementation/bootstrap/continuous execution and route to `agents-md-builder`
- `bypassed`: continue only within the explicit bypass boundary and report residual risk

## `sync`

Meaning:

- read current truth and context artifacts
- refresh the operator's understanding
- do not start implementation

Use when:

- the user asks to update current project status
- the user asks "what is next?"
- the user says not to implement
- the control deck looks stale

Stop condition:

- project / phase / acceptance / next best step are reported
- Project Charter Gate status is reported when missing, incomplete, stale, or bypassed

## `drive`

Meaning:

- move the current project through the approved phase's role chain until
  closeout or a real stop condition

Use when:

- the user asks to continue, advance, implement, verify, or close out
- current truth is fresh enough
- the selected role has a clear next action
- Project Charter Gate is `pass` or safely bypassed
- the user asked for a bounded single role/action, or autopilot cannot safely run
  the approved phase chain

Typical routes:

- planner -> executor
- executor -> reviewer
- reviewer -> verifier
- verifier -> closeout
- hygiene -> planner

Stop condition:

- closeout completes and the next phase needs operator review
- a gate blocks progress
- verification fails
- writeback fails
- if the user already accepted the previous recommended next step, do not repeat it as a new recommendation; either execute it or report the blocking gate
- if acceptance is `accepted-with-closeout-pending`, the narrow step is closeout; do not re-run planning, review, or verification unless evidence has become stale or contradictory

Do not stop merely because executor completed and reviewer is next, reviewer
completed and verifier is next, or verifier completed and closeout is next.
Those are internal role gates inside the same approved phase. Preserve the
gates by running them, not by asking the operator to approve each transition.

Stop mid-chain only when scope, non-goals, acceptance criteria, destructive
actions, credentials, external services, failed verification, missing evidence,
writeback failure, stale truth, or contradictory role packets require a human
decision or recovery.

## `continuous`

Meaning:

- run the current phase through the existing autopilot chain instead of asking the user to approve every role transition
- preserve all committed role gates: planner, executor, reviewer, verifier, repair, closeout, and hygiene
- route through `npm run threadsmith:autopilot -- continue <project-root>` so the continuation decision can safely choose start, resume, wait, or reset-needed

Use when:

- the user says to keep going until the current phase is done
- the user explicitly complains that manual gate-by-gate prompting is too slow
- the user approves a concrete Threadsmith recommendation that belongs to an
  already-approved phase chain
- current truth is fresh enough and the project has a clear current phase
- the next step can be represented as one locked phase run
- Project Charter Gate is `pass`

Stop condition:

- the phase run reaches accepted
- the phase run pauses on risk, missing information, unavailable credentials, infrastructure failure, or repair-loop limit
- committed truth says the current phase is already accepted and needs a new phase reset
- writeback fails
- destructive git or publishing action would be required

## `recover`

Meaning:

- stop normal execution and restore safe truth before continuing

Use when:

- thread was interrupted
- git diff exists but acceptance is stale
- run is stuck in `running`
- evidence is older than implementation changes
- truth contradicts repo state
- user reports bad or confusing state

Stop condition:

- safe next action is identified
- stale truth is repaired
- a handoff is produced
- user input is required

## Deck-facing Actions

Deck-facing actions are a deferred UI surface while frontend maintenance is
frozen. They remain documented as action names so state and CLI behavior can map
to a future deck, but skill/protocol truth is the authority.

### `advance-phase`

Route through planner/executor/reviewer depending on acceptance state.

### `continue-autopilot`

Route through the autopilot continuation decision. It may start a new phase run, resume a paused one, wait for an already-running one, or request phase reset when committed truth is already accepted.

### `open-current-phase`

Inspect the Current Phase contract. Do not mutate truth.

### `open-project-charter`

Inspect the applicable `AGENTS.md` and report Project Charter Gate status. Do
not mutate truth.

### `repair-project-charter`

Route to `agents-md-builder` or hygiene depending on whether the issue is
missing/incomplete AGENTS.md or a contradiction between AGENTS.md and
`.threadsmith/`.

### `bootstrap-from-agents`

Bootstrap `.threadsmith/` from confirmed AGENTS.md, repo inspection, user
request, and existing docs/manifests. Do not invent uncertain architecture
decisions.

### `run-verification`

Route to verifier. Requires implementation and review to be ready.

### `run-hygiene`

Route to hygiene. Prefer this when truth freshness is questionable.

### `review-proposal`

Route to hygiene / reviewer. Prefer this when a writeback proposal exists but
has not been reviewed, conflicts with committed truth, lacks required evidence,
or appears to self-accept final state. Do not continue normal execution from a
proposal until it is explicitly accepted, rejected, or converted into a safe
recovery action.

### `create-handoff`

Route to hygiene and produce a continuation artifact.

## Stop-and-Ask Rules

Stop and ask instead of continuing when:

- phase goal is ambiguous
- selected role packet contradicts committed truth
- Project Charter Gate fails for execution-like work
- writeback failed
- destructive git action would be required
- verification requires unavailable external credentials or services
- user decision changes scope or non-goals

## Acknowledgement Rule

Short approval replies such as "同意", "可以", "继续", "好", "yes", or
"proceed" are not ambiguous when the previous Threadsmith response recommended
a concrete next step. In that case:

- mark `accepted previous recommendation` as `yes`
- inherit the previous recommended action
- inherit the selected mode and role-chain when still valid
- execute the accepted phase chain or report the blocking gate
- do not end by asking for the same approval again
- do not choose `sync` merely because the user's reply is short

If a new risk, destructive action, scope change, missing credential, or failed
writeback appears while executing the accepted step, stop and report that gate.

When committed truth says `accepted-with-closeout-pending`, an approval reply
selects role `closeout` and should write the closeout truth instead of
recommending closeout again.

Anti-repeat invariant:

- if the previous response ended with a concrete recommended next step and the
  user approves it, the next Threadsmith response must be execution-shaped
- execution-shaped means it contains an action attempt, artifact creation,
  verification command, truth writeback, or explicit blocking gate
- it must not restate "next I recommend..." as the main result
- it must not stop only to ask whether to run the next internal role gate
- if no execution is possible because the previous recommendation is not
  recoverable from context, switch to `recover` and say exactly what is missing

## Role Chain Cadence Rule

Threadsmith pauses between phases, not between routine roles.

Once a phase plan or concrete next-step recommendation is accepted, the default
execution cadence is:

```text
planner approval -> executor -> reviewer -> verifier -> closeout -> stop for next phase review
```

Internal role transitions are not operator approval points:

- executor -> reviewer means "review the just-created artifact";
- reviewer -> verifier means "verify the reviewed artifact";
- verifier -> closeout means "record accepted truth and package the result".

Use `下一内部 gate` for these transitions if they need to be named. Reserve
`下一 phase 预览` for closeout or a genuine new phase. This avoids presenting
reviewer, verifier, or closeout as a fresh user decision.

## Adaptive Work Session Rule

A work session is a bounded group of related actions inside the current phase.
It keeps Threadsmith from turning every small implementation move into a new
micro-phase, while preserving planner, executor, reviewer, verifier, closeout,
and hygiene gates.

Use work-session continuation when:

- the operator accepted the current direction;
- the next 2-4 actions touch the same subsystem and accepted goal;
- no unapproved consumer surface, product semantics change, provider default,
  credential, release, public sync, or destructive action appears;
- verification can remain `narrow` or `standard`;
- truth can be written at the session boundary without hiding a blocker.

Do not bundle work into a work session when the next action changes product
semantics, exposes a new UI route / API endpoint / CLI command / public
integration, changes provider defaults, requires credentials, publishes,
merges, tags, deletes, resets, migrates data, contradicts committed truth, or
repairs a failed verification whose path is uncertain.

Short approvals such as "同意，请使用 Threadsmith 推进" may continue an accepted
work session until a natural stop. If the user asks for one explicit role or one
explicit action, honor that narrower request.

## Closeout Tier Rule

Choose the smallest closeout tier that preserves orientation and safety:

- `lite`: small or low-risk work. Include changed, verification, truth, next,
  and risk only when material.
- `standard`: normal bounded implementation. Include result, changed
  capability, verification, truth, remaining risk, and next phase.
- `audit`: release, PR / merge, public docs, destructive operations,
  architecture boundaries, provider routing, security, or cross-agent state.
  Use the full Threadsmith Output Contract skeleton.

Full skeleton output is still mandatory for audit events and major phase
boundaries. Small accepted work may use `lite` when no stop gate or durable
route change exists.

## Gap Check Budget Rule

Gap checks prevent wrong work; they must not replace work.

Default: one gap check per work session. If a gap check already selected an
implementation path, the next normal action is implementation, not another gap
check, unless verification failed, scope changed, product direction changed,
release / destructive / public risk appeared, provider routing changed, or
committed truth contradicts repo evidence.

## Product / User-Value Heartbeat Rule

After three consecutive governance-heavy accepted sessions without a heartbeat,
recommend one lightweight value check at the next phase boundary or
work-session closeout. Count `standard` and `audit` closeouts as
governance-heavy; `lite` closeouts do not increment the counter.

The heartbeat is advisory. It asks whether the project became more usable,
understandable, reliable, playable, or closer to its stated goal, and whether
the next local engineering step is still highest value. It must not rewrite
acceptance, force a direction change, or interrupt an accepted implementation
path unless a real stop gate appears.

Governance-heavy means `full-governance` or a closeout that updates committed
truth across acceptance, phase, provider, release, or cross-agent state.
Internal-only means the work changed internal structure, tests, docs, or state
machinery without creating a user-visible or operator-visible capability.

## Human-Centered Operating Mode Rule

Use one operating mode per Threadsmith action:

- `light-repair`: one-surface fixes, copy edits, focused test expectation
  updates backed by accepted behavior, or local cleanup that does not claim
  durable phase acceptance
- `normal-implementation`: ordinary bounded implementation, related multi-file
  work sessions, focused refactors, and behavior covered by existing acceptance
- `full-governance`: architecture boundaries, release / PR / merge,
  cross-agent state, provider routing, destructive actions, credentials, new or
  changed public behavior with unclear semantics / compatibility risk / release
  impact / product safety risk, stale truth, or contradictory evidence

Default ambiguity rule:

- uncertain `light-repair` vs `normal-implementation`: use
  `normal-implementation`
- uncertain `normal-implementation` vs `full-governance`: use
  `full-governance` only when a real stop gate exists; otherwise stay in
  `normal-implementation` and name the residual risk
- unsafe legacy mode / tier: fall back to `full-governance` and explain the
  missing signal

## Truth Writeback Tier Rule

Use one writeback tier per action:

- `evidence-only`: no committed truth state changes; evidence may live in the
  final response, command output, local run artifact, or explicitly configured
  runtime evidence artifact. Prefer ignored/temp paths; if ignored status is
  unknown, label the artifact as an `untracked artifact risk`.
- `current-context`: update current packet, active work, or evidence summary
  only because the next operator turn needs that fact
- `committed-truth`: update phase, acceptance, status, supervision, role
  packets, handoff, proposal review, or phase history because durable project
  state changed

Writeback file allowlist:

- `evidence-only`: default to 0 `.threadsmith` state-file writes. Use final
  response, command output, test output, or ignored/temp local artifact.
- `current-context`: may update only next-turn context/evidence such as
  `.threadsmith/context/current-packet.json`,
  `.threadsmith/context/evidence-summary.json`, or `.threadsmith/active-work.json`
  when that fact affects the next action.
- `committed-truth`: may update durable files such as
  `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`,
  `.threadsmith/project-status.json`, project brief/roadmap/supervision, role
  packets, handoff/routing files, or `.threadsmith/history/phases.jsonl` only
  when those surfaces actually changed.

Do not create optional context files solely to satisfy a tier, and do not rewrite
role packets when they only restate current packet facts.

Runtime recommendations should include surface metadata when determinable:

- `surfaceAudience`: `internal`, `developer`, `operator`, or `user_public`
- `workVisibility`: `internal`, `developer_visible`, `operator_visible`, or
  `user_visible`

`operator` surfaces may continue inside an approved scope when local,
reversible, and not changing long-term workflow semantics. Upgrade them to
`full-governance` when they create a long-lived operator/public entry point,
alter defaults, affect compatibility, or could be mistaken for public behavior.

Short approvals do not create committed truth by themselves. They execute the
accepted step unless they also change scope, product direction, architecture,
acceptance, or durable route.

## Output Budget Rule

Budget output by operating mode:

- `light-repair`: 3-5 concise lines with changed, verification, material risk,
  and next if any
- `normal-implementation`: short closeout with capability, verification,
  writeback tier, and next concrete action
- `full-governance`: full audit skeleton only when a real audit boundary exists

Every next step must include plain action, affected layer, why now, expected
deliverable, verification level, and stop reason only when one exists. Do not
answer "what is next?" with only a phase name.

## Capability Translation Rule

Every next step or closeout must translate the technical object into the project
capability it enables. If the capability is not user-visible yet, say so and
name the internal layer that changed.

## Full Governance Speed Rule

Full governance means role-complete, not approval-heavy.

When a phase plan is approved, Threadsmith should run the approved phase as one
continuous chain and preserve planner, executor, reviewer, verifier, and
closeout responsibilities. The speed improvement comes from removing redundant
operator stops, not from removing review or verification.

Hot-path governance must prefer deterministic checks over repeated LLM-heavy
judgment. Use stop reasons, verification levels, context budgets, and friction
budgets before asking the operator or launching a broad re-plan. These friction
budgets cap repeated restatements, repair loops, and verification breadth.

## Deterministic Stop Reasons

Use one named stop reason whenever full governance pauses:

- `continue`: no real gate; proceed through the current approved role chain
- `pause_for_operator_decision`: scope, non-goals, acceptance, or product
  direction would change
- `pause_for_blocker`: reviewer, verifier, repo, dependency, or test evidence
  blocks progress
- `pause_for_recovery`: committed truth, role packet, Context Packet, evidence,
  or git state is stale or contradictory
- `pause_for_release_action`: merge, publish, tag, public sync, release notes,
  or external release action is required
- `pause_for_destructive_action`: destructive git, file, data, credential, or
  irreversible environment action is required
- `closeout_boundary`: the approved phase is complete and the next phase needs
  operator review

Do not stop with vague language such as "next step?" when one of these reasons
applies. If none applies, continue the internal role chain.

## Context and Observation Budget Rule

Full governance must reduce context drag before adding more process.

Default context preference:

1. current packet over full thread replay
2. selected role packet over all-role context
3. recent high-fidelity failing evidence over old verbose logs
4. masked, trimmed, or summarized command output when exact output is not needed
5. exact full output for failures, user-requested diagnostics, audit evidence,
   and proof of acceptance

This keeps the role focused on the current phase while preserving evidence that
actually proves or disproves the done-when.

## Staged Verification Rule

Choose the smallest verification level that matches risk, then escalate only
when the evidence requires it.

- `narrow`: changed-file, contract, fixture, or focused evidence checks
- `standard`: package tests plus relevant contract checks
- `release`: full release, launcher, sync, changelog, package, and public
  surface checks

Use `narrow` for small contract/docs/test slices, `standard` for skill or
workflow behavior, and `release` for release-facing or public-surface work.
Escalate on failed verification, broad impact, release work, or contradictory
evidence.

## Sparse Course-Correction Rule

Full governance should catch inefficient trajectories without restarting the
whole plan after every role.

Run a lightweight course-correction check at phase boundaries, after repeated
repair, or when output begins to loop:

- are we repeating a recommendation instead of executing it?
- are we drifting from the approved phase?
- did verification evidence prove the done-when?
- are protocol labels replacing operator-facing explanation?
- did the same blocker occur twice?

If the check passes, continue. If it fails, use a named stop reason or route to
recovery. Do not convert this check into a routine approval prompt.

## Output Level Rule

Boundary full output is required for:

- `recover`
- bootstrap
- closeout
- accepted phases
- phase-boundary reports
- any response that writes or proposes durable truth changes

Internal progress output is enough for routine role-chain handoffs inside an
approved phase:

- completed internal gate
- next internal gate
- current stop reason: `continue` or named pause reason
- evidence/risk only when it changes the execution decision

Compact sync output is enough for read-only status refresh:

- current state
- current phase
- acceptance state
- next step
- risks or confirmation needs

Direct conceptual answers are allowed when the user asks how Threadsmith works
or asks for clarification. In that case, do not force the full workflow report,
do not write `.threadsmith/`, and label the source layer for factual claims.

## Phase Narrative Rule

For closeout, accepted phases, or any response that introduces the next phase,
Threadsmith must produce a phase narrative, not only a protocol status list.

### Closeout Output Gate

Before finalizing the response, check whether the action crossed a durable
phase or slice boundary. If any two closeout signals are present, boundary full
output is mandatory:

- completed, accepted, closed out, or ready for next phase
- commit, PR, merge, release, tag, truth writeback, packet update, or closeout
  artifact created
- verification passed or acceptance evidence listed
- next phase, next slice, or next recommended direction introduced

When the gate triggers, do not use a compact prose closeout like:

```text
已用 Threadsmith 推进并完成 ...
这一步做的是 ...
验证已通过 ...
下一步建议 ...
```

That shape loses the operator orientation contract. The same content must be
placed under `一句话结论`, `本 phase 的结果`, `这一步具体做了什么`,
`这一步解决的问题`, `验证`, `下一 phase 预览`, and `你需要审核的点`.

The Threadsmith closeout contract overrides ordinary concise final-answer style.

Use this exact human-first field skeleton. Do not satisfy the rule with section
headings and free-form paragraphs only:

- `一句话结论`: 1-2 Chinese sentences explaining what capability changed, where
  the work stopped, and what the operator needs to approve next. Do not start
  a closeout with protocol fields.
- `本 phase 的结果`: `phase 名称`, `result`, `交付物`, `结果一句话`, and
  `架构影响`.
- `这一步具体做了什么`: `Before`, `Changed`, `After`, and `Not changed`.
  This section must explain the functional change, not merely list files.
- `这一步解决的问题`: `用户困惑`, `架构/流程缺口`, and `为下一步铺路`.
- `验证`: `已运行`, `结果`, and `未运行与风险`.
- `下一 phase 预览`: planner-style brief fields `Phase`, `continuity`,
  `Why now`, `Questions`, `Deliverables`, `Non-goals`, `Done when`, and
  `Stop condition`.
- `你需要审核的点`: only route, scope, non-goal, or acceptance decisions.
- `Threadsmith Decision`: compact protocol footer only: `mode`, `source layer`,
  `role-chain status`, and `active gate or stop condition`.

The narrative should be concrete enough that the operator can answer:

- what was missing before this phase;
- what changed in this phase;
- what the system or user can now do;
- what still did not change;
- what the next phase will produce;
- what the operator actually needs to approve.

Avoid vague labels such as "continue optimization" or "improve workflow" unless
they are immediately translated into questions, deliverables, and done-when
criteria.

When multiple next-step options are reasonable, recommend one first and explain
the tradeoff in the required fields. Do not output only `Option A` / `Option B`
bullets without `Why now`, `Deliverables`, and `Done when`; that makes the
operator decode the plan instead of reviewing it.

## Operator Translation Rule

Threadsmith must not make the operator decode implementation vocabulary.

Whenever a full output mentions a dense technical noun such as a file path,
function, command, enum value, provider, role, runtime object, packet, proposal,
or internal module, translate it once in the same section.

Use capability-first wording:

- Bad: "`runCatchUp` calls `tickRuntime` and returns `needs_more`."
- Good: "现在系统有了底层补跑执行器：它会按计划逐个补跑任务窗口。实现上，这个能力叫
  `runCatchUp`，它通过 Runtime Service 的 `tickRuntime` 执行。"

For each important technical object, answer:

- what it means in plain operator language;
- which layer it belongs to, such as truth, role packet, Context Packet,
  runtime contract, action contract, tests, docs, CLI, or UI;
- what the operator or system can do now because this object exists;
- whether it is already user-facing or still only an internal foundation.

`Threadsmith Decision` should stay compact, appear at the end, and contain only
the minimum protocol fields needed for auditability. The explanatory burden
belongs in `一句话结论`, `本 phase 的结果`, `这一步具体做了什么`,
`这一步解决的问题`, and `下一 phase 预览`.

`operatorExplanationStyle` may be `concise`, `balanced`, `teaching`, or
`detailed`. It changes explanation depth only; it must not change safety gates,
verification level, or writeback tier.

Durable truth timestamps use new-write-only UTC ISO 8601 with milliseconds
(`YYYY-MM-DDTHH:mm:ss.SSSZ`). Do not bulk-rewrite legacy timestamps solely for
normalization.

Before recommending commands such as
`npm run threadsmith:autopilot -- continue <project-root>`, check the target
repo first, then Threadsmith control deck, then global command availability. If
availability cannot be safely checked, provide the manual equivalent instead of
presenting the command as executable.

## Next-Step Continuity Rule

Every `next step` statement must first decide how the proposed move relates to
already committed work. This prevents Threadsmith from making an active line of
work sound like a brand-new initiative.

Use exactly one continuity label:

- `new`: no committed truth, merged PR, accepted plan, doc, test, or generated
  artifact shows this direction has started
- `continue`: the next action executes another narrow slice in an existing
  direction
- `consolidate`: the next action turns already completed pieces into a stable
  definition, v1 boundary, closeout, or operator-facing shape
- `gap-check`: the next action compares existing work against the intended
  definition and lists what is missing
- `handoff`: the next action packages current truth for another thread or agent
- `blocked`: the next action cannot run until a gate, contradiction, or missing
  decision is resolved

When evidence shows the direction has already started, do not say "start",
"first write", "begin design", or "now create the plan" unless the action is
explicitly scoped to a new sub-slice. Prefer "continue", "consolidate", or
"gap-check" and name the existing evidence that makes it not-new.

Examples:

- Bad: "Next, start the project-level state store design."
- Good: "continuity: consolidate. The state bridge already has handoff,
  adapter, proposal, and freshness pieces; next we consolidate those into a v1
  boundary doc and gap list."
- Bad: "Next, write the design doc" after merged implementation exists.
- Good: "continuity: gap-check. Compare the merged implementation and operator
  docs against the intended v1 contract, then list missing pieces."

## Architecture Comprehension Rule

For significant work, the response must include a compact `架构影响` line in
`本 phase 的结果`. This is not planner ownership and must not become a second task
plan. It should name:

- the affected layer, such as committed truth, role packet, Context Packet,
  runtime contract, action contract, tests, docs, or product UI
- the concrete object or module being changed
- why that layer matters to the workflow

If the current action is only read-only status sync, say that no architecture
change is being made.

Orientation rule:

- `本 phase 的结果` explains the durable result, not merely the previous
  sentence in chat
- `这一步具体做了什么` uses Before / Changed / After / Not changed to make the
  functional delta inspectable
- `这一步解决的问题` explains the operator confusion, architecture gap, and
  follow-up capability
- `下一 phase 预览` explains the next executable phase as a brief, and includes
  the continuity label from the Next-Step Continuity Rule
- `你需要审核的点` names only route, scope, non-goal, or acceptance decisions
- keep these sections concrete enough that an operator can understand the
  project without repeatedly asking what changed or why the next slice matters

## Preview Rule

Before any execution-like action, provide a short preview:

- action label
- selected mode
- selected role
- role packet status
- why now
- expected stop condition
- if continuing from an already accepted recommendation, say whether you are executing it or why it is blocked instead of re-issuing the same advice

For `continuous`, the selected role may be `phase-runner`; include whether the runner will use `continue`, `start`, `resume`, `wait`, or `reset-needed`.

## Preference Rule

When action behavior depends on saved preference, use:

- project default
- then global default
- then ask
