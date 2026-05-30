# Role Contracts

Threadsmith uses role-first orchestration. Each role should prefer its matching role packet when present:

```text
.threadsmith/context/role-packets/<role>.json
```

If the packet is missing or stale, use committed truth and the main Context Packet.

## Role Transition Table

Use committed acceptance state before selecting a role. Do not infer role order
from chat memory when committed truth is available.

| Committed state signal | Next role | Meaning | Stop condition |
| --- | --- | --- | --- |
| No usable current phase, stale phase, or contradictory truth | hygiene | Repair the state boundary before normal work | safe next action or recovery blocker identified |
| Current phase exists but lacks executable scope, done-when, or verification plan | planner | Narrow the phase contract | phase contract is executable or needs operator decision |
| Implementation is not ready for review | executor | Produce the scoped implementation or artifact | implementation is ready for review or blocked |
| Implementation is ready for review, but review has not passed | reviewer | Check scope, risk, and implementation quality | ready-for-verification or review-blocked |
| Review has passed, but verification has not passed | verifier | Run or inspect required evidence | accepted-with-closeout-pending or verification-failed |
| Verification passed and final state is accepted-with-closeout-pending | closeout | Record final accepted truth and next planned slice | accepted or closeout blocker |
| Final state is accepted | planner | Start only a new phase reset or next phase review | next phase approved or stop at boundary |

Internal transitions inside an approved phase are not operator approval points.
Use the stop reasons in `action-contracts.md` when a transition cannot continue.

## Planner

Role packet: `.threadsmith/context/role-packets/planner.json`

Required inputs:

- applicable `AGENTS.md`
- Project Brief
- Current Phase
- project status
- scope
- risks
- next step

Allowed writes:

- `.threadsmith/current-phase.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`

Forbidden writes:

- source code implementation
- marking verification passed
- marking final acceptance

Completion artifact:

- narrowed phase contract or explicit stop reason

## Executor

Role packet: `.threadsmith/context/role-packets/executor.json`

Required inputs:

- applicable `AGENTS.md`
- Current Phase
- in-scope and out-of-scope lists
- relevant files
- recent diff
- implementation constraints

Allowed writes:

- source code and tests in the current slice
- `.threadsmith/active-work.json`
- `.threadsmith/acceptance-state.json` only to move implementation toward `ready-for-review`

Forbidden writes:

- marking review passed
- marking verification passed
- marking final acceptance
- broad unrelated refactors

Completion artifact:

- implementation summary, changed files, and verification commands that should be run next
- if the action is `light-repair`, state why it does not claim durable phase
  acceptance and which focused verification is enough

## Reviewer

Role packet: `.threadsmith/context/role-packets/reviewer.json`

Required inputs:

- applicable `AGENTS.md`
- acceptance claim
- Current Phase
- scope
- recent diff
- risks
- relevant files

Allowed writes:

- `.threadsmith/acceptance-state.json` to `ready-for-verification` or `review-blocked`
- `.threadsmith/active-work.json`
- review notes or issue artifacts when needed

Forbidden writes:

- running the final verification claim as if independent
- marking final acceptance
- rewriting implementation except for explicitly approved tiny fixes

Completion artifact:

- review finding list or explicit no-findings note with residual risks

## Verifier

Role packet: `.threadsmith/context/role-packets/verifier.json`

Required inputs:

- applicable `AGENTS.md`
- acceptance checklist
- verification commands
- evidence summary
- artifact refs
- current claim

Allowed writes:

- `.threadsmith/acceptance-state.json` to `verification-failed` or `accepted-with-closeout-pending`
- `.threadsmith/context/evidence-summary.json`
- evidence artifacts under runtime/artifact paths

Forbidden writes:

- converting missing evidence into a pass
- changing implementation to make tests pass unless routed to repair
- marking final acceptance before closeout

Completion artifact:

- verification result with exact commands and evidence refs
- verification type: unit, contract, smoke, e2e, behavior sample, or structural
  mock evidence
- if mock-first evidence is used, say that it proves structure and boundaries,
  not live-provider quality

## Closeout

Role packet: `.threadsmith/context/role-packets/closeout.json`

Required inputs:

- applicable `AGENTS.md`
- accepted-with-closeout-pending claim
- known gaps
- residual risks
- evidence refs
- source refs

Allowed writes:

- `.threadsmith/acceptance-state.json` to `accepted`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`
- docs or changelog updates only when required by the slice and durable enough
  for future recovery, audit, public docs, architecture decisions, or explicit
  operator request

Writeback tier guard:

- `evidence-only`: do not mutate committed state. Use final response, command
  output, test output, or ignored/temp artifact.
- `current-context`: update only next-turn context/evidence such as current
  packet, evidence summary, or active work when the next action needs it.
- `committed-truth`: update acceptance/status/supervision/phase history only
  when durable project state changed.

Forbidden writes:

- new implementation scope
- hiding residual risk
- accepting without verification evidence
- creating closeout reports by default for light repairs or ordinary work
  sessions
- rewriting role packets when they only restate current packet facts

Completion artifact:

- closeout summary, cleanup result, residual risks, and next planned slice
- capability translation: what changed for the project or operator, not only
  which file or state object changed
- if a durable report is created, state why it is durable; otherwise final
  response plus evidence summary / verification output is enough

## Hygiene

Role packet: `.threadsmith/context/role-packets/hygiene.json`

Required inputs:

- applicable `AGENTS.md`
- committed truth
- recent diff
- evidence summary
- budget warnings
- blockers
- source refs

Allowed writes:

- `.threadsmith/current-phase.json` only when re-anchoring is required
- `.threadsmith/acceptance-state.json` only to correct stale status
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- handoff or recovery artifacts

Forbidden writes:

- normal feature implementation
- claiming verification
- silently discarding contradictory evidence

Completion artifact:

- hygiene summary with verified facts, stale assumptions, contradictions, and next safe action

## Role-Specific AGENTS.md Checks

Planner:

- check current phase against goals, non-goals, architecture boundaries, and risk rules
- identify confirmation gates before execution

Executor:

- do not cross edit boundaries
- do not execute high-risk operations without confirmation
- explain diffs relative to architecture boundaries

Reviewer:

- review for architecture and risk-policy violations

Verifier:

- verify the checks required by `AGENTS.md` or report why unavailable

Closeout:

- identify whether stable lessons should update `AGENTS.md`
- recommend durable-rule updates by default; write only through confirmed builder/update flow

Hygiene:

- resolve AGENTS.md / `.threadsmith/` contradictions before normal work
