# Action Contracts

Threadsmith v2 supports four supervisor modes plus deck-facing actions.

All execution-like actions first run Project Charter Gate unless the user
explicitly bypasses it for low-risk exploratory work.

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

- move the current project through the next narrow Threadsmith step

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

- the selected role completes its narrow artifact
- a gate blocks progress
- verification fails
- writeback fails
- if the user already accepted the previous recommended next step, do not repeat it as a new recommendation; either execute it or report the blocking gate
- if acceptance is `accepted-with-closeout-pending`, the narrow step is closeout; do not re-run planning, review, or verification unless evidence has become stale or contradictory

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
- inherit the selected mode and role when still valid
- execute the accepted step or report the blocking gate
- do not end by asking for the same approval again
- do not choose `sync` merely because the user's reply is short

If a new risk, destructive action, scope change, missing credential, or failed
writeback appears while executing the accepted step, stop and report that gate.

When committed truth says `accepted-with-closeout-pending`, an approval reply
selects role `closeout` and should write the closeout truth instead of
recommending closeout again.

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
