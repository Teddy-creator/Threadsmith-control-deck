# Runtime Contract

Threadsmith uses the active project's `.threadsmith/` directory as the source of truth.

`AGENTS.md` is the project constitution. It defines durable project intent,
architecture boundaries, risk rules, verification expectations, and human
confirmation gates. `.threadsmith/` remains the current execution truth.

If AGENTS.md and `.threadsmith/` disagree, stop normal execution and route to
hygiene or recover before new implementation.

## Project Charter Gate

Run Project Charter Gate before normal bootstrap or execution.

Gate inputs:

- explicit user path, git root, or current working directory
- nearest applicable `AGENTS.md`
- root or parent `AGENTS.md` when relevant
- `.threadsmith/` truth if present
- repository signals such as README, package manifests, test scripts, docs, and source layout

Gate result levels:

- `pass`: enough durable guidance exists for normal Threadsmith work
- `warn`: read-only or low-risk work may continue, but missing guidance must be reported
- `fail`: implementation, bootstrap, or continuous execution stops and routes to `agents-md-builder`
- `bypassed`: user explicitly chose to skip or defer project constitution setup; residual risk must be recorded

The gate should inspect whether the applicable project constitution covers:

- project purpose
- goals and non-goals
- repository map
- important commands
- architecture boundaries
- risk and permission rules
- human confirmation gates
- definition of done

`sync` may continue in read-only mode on `warn` or `fail`, but it must report
charter status. `drive`, `continuous`, and implementation bootstrap must stop on
`fail` unless a safe explicit bypass applies. `recover` and hygiene may proceed
to repair contradictory or stale state.

## Project Charter Gate Matrix

| Situation | `sync` | `drive` / implementation | `continuous` | Required response |
| --- | --- | --- | --- | --- |
| Useful AGENTS.md exists | continue | continue | continue | mention source path when relevant |
| AGENTS.md missing and no decline memory | continue read-only with warning | stop | stop | ask once, route to `agents-md-builder` before implementation |
| AGENTS.md placeholder or incomplete | continue read-only with warning | stop | stop | identify missing fields and route to `agents-md-builder` |
| AGENTS.md stale | continue read-only with warning | stop | stop | route to hygiene unless user requests read-only sync |
| User previously declined setup | continue read-only with existing-constraint note | stop | stop | do not ask again unless risk/scope changed |
| AGENTS.md contradicts `.threadsmith/` | stop normal sync and recover | stop | stop | route to hygiene / recover |
| Explicit low-risk read-only bypass | continue with residual risk | stop if mutating source | stop | record residual risk and avoid implementation |

## Decline Memory

If the user declines AGENTS.md creation or update, record that decision in
`.threadsmith/preferences.json` or another committed truth artifact.

Do not repeat the same AGENTS.md setup prompt unless:

- the user asks to revisit project constitution
- project risk level increases
- scope changes materially
- AGENTS.md and `.threadsmith/` contradict each other
- the previous decline is stale for the current task

Operational behavior:

- read-only `sync` may continue after a prior decline, but must report that
  implementation remains blocked until the constitution is confirmed
- `drive`, `continuous`, implementation bootstrap, and source-mutating deck
  actions must stop after a prior decline and route to `agents-md-builder` or a
  user confirmation gate
- if decline memory exists, do not phrase the result as a brand-new suggestion
  to create AGENTS.md; phrase it as an existing constraint
- if no decline memory exists and AGENTS.md is missing, ask once with a concrete
  reason tied to project risk, architecture boundaries, and verification
  expectations

First-run charter prompt shape:

- what is missing: AGENTS.md / project constitution
- why it matters: durable purpose, non-goals, architecture boundaries,
  commands, verification, and human confirmation gates
- what will happen if accepted: route to `agents-md-builder` before normal
  Threadsmith execution
- what will happen if declined: remember the decline and allow read-only sync,
  but block implementation-like work

## Monorepo Rules

- nearest applicable `AGENTS.md` wins for local task behavior
- root `AGENTS.md` provides global fallback constraints
- parent/child conflicts route to hygiene instead of silently choosing the easier rule

## Required Committed Truth

Read these before deciding the next move:

- `.threadsmith/project-brief.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`
- `.threadsmith/preferences.json`

`action-queue.ndjson` is append-only action history. Do not treat it as the main state object.

## Context Artifacts

Use these when present:

- `.threadsmith/context/current-packet.json`
- `.threadsmith/context/role-packets/planner.json`
- `.threadsmith/context/role-packets/executor.json`
- `.threadsmith/context/role-packets/reviewer.json`
- `.threadsmith/context/role-packets/verifier.json`
- `.threadsmith/context/role-packets/closeout.json`
- `.threadsmith/context/role-packets/hygiene.json`
- `.threadsmith/context/repo-map.json`
- `.threadsmith/context/evidence-summary.json`

Context artifacts are derived from committed truth and repo signals. They are useful working context, but committed truth remains the authority if there is a conflict.

When reporting or rendering status, label the source layer explicitly:

- committed truth: durable `.threadsmith/` state
- role packet: role-scoped working context derived from committed truth
- Context Packet: shared derived working context
- repo/evidence signal: file, test, or runtime evidence
- UI/demo interpretation: synthetic presentation or learning fixture, not authority

When frontend maintenance is frozen for a phase, treat UI/demo interpretation as
deferred presentation work unless it contradicts skill/protocol truth.

## Freshness Rules

A context artifact is fresh enough when:

- its parent phase matches `.threadsmith/current-phase.json`
- its acceptance claim matches `.threadsmith/acceptance-state.json`
- its role matches the selected role
- its evidence is not older than the latest implementation change when verification is being claimed

If freshness cannot be proven, say so and fall back to committed truth.

## Read Priority

1. Applicable `AGENTS.md`
2. Committed truth
3. Matching role packet
4. Main Context Packet
5. Repo map and evidence summary
6. Chat memory

Chat memory may explain intent, but must not override committed truth.

## Writeback Rules

Write `.threadsmith/` only for durable boundary changes:

- phase drafted, narrowed, blocked, reset, or accepted
- acceptance status changes
- active role or blocker changes
- verification evidence changes the claim
- closeout records residual risks or next step
- recovery identifies stale or contradictory truth

Do not write casual discussion, tentative options, or private reasoning.

## Writeback Failure Handling

If a required write fails:

- stop before claiming success
- report which file should have changed
- report the intended durable update
- report whether code changes landed without truth changes
- recommend retry, manual repair, or handoff

Do not silently continue with stale truth after a failed write.

## Deck Relationship

The control deck is a view over this state.

Deck actions should map back to explicit Threadsmith actions, not free-form magic.
