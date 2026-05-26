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
4. Mode: `continuous` for keep-going/autopilot, `drive` for next-step work,
   `sync` for read-only status, `recover` for repair.
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

## Output Level Rule

Full output is required for:

- `drive`
- `continuous`
- `recover`
- bootstrap
- closeout
- any response that writes or proposes durable truth changes

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

Use this structure:

- `本 phase 的结果`: name the phase, result, 3-5 concrete deliverables, and one
  sentence describing the capability or operator state that changed.
- `这一步具体做了什么`: use `Before`, `Changed`, `After`, and `Not changed`.
  This section must explain the functional change, not merely list files.
- `这一步解决的问题`: name the user confusion, architecture/process gap, and
  follow-up capability this phase unlocks.
- `验证`: list commands, CI, PR, artifacts, or gate results with pass/fail/not-run
  status.
- `下一 phase 预览`: write a planner-style brief with `Phase`, `continuity`,
  `Why now`, `Questions`, `Deliverables`, `Non-goals`, `Done when`, and
  `Stop condition`.
- `你需要审核的点`: include only decisions that could change route, scope,
  non-goals, or acceptance.

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

`Threadsmith Decision` should stay compact and may contain protocol fields.
The explanatory burden belongs in `本 phase 的结果`, `这一步具体做了什么`,
`这一步解决的问题`, and `下一 phase 预览`.

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

For significant work, the response must include a compact architecture impact
line. This is not planner ownership and must not become a second task plan. It
should name:

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
