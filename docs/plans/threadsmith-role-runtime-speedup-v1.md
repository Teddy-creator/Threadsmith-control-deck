# Threadsmith Role Runtime Speedup v1

> Status: Accepted. Steps 1-6 are implemented and verified; Step 7 remains a
> follow-up if/when the repository skill contract wording is synced with the
> runtime behavior.
> Scope: reduce the runtime cost of each full-governance role without lowering
> engineering quality or skipping legitimate planning, review, verification, or
> closeout responsibilities.

## Goal

Make Threadsmith's full-governance chain feel faster for real work.

This plan does not treat speed as "skip planner" or "remove reviewer". The
target is narrower: planner, executor, reviewer, verifier, and closeout should
each receive less irrelevant context, reuse precomputed evidence, avoid repeated
repo discovery, and produce role-shaped outputs.

Operator-facing target:

- when the phase is a planning phase, planner should still plan and stop for
  review when that is the accepted deliverable;
- when the phase is an approved implementation phase, the internal role chain
  should continue without manual stops unless a real gate appears;
- every role should run from a compact, evidence-backed packet instead of
  rediscovering the project or replaying the whole conversation.

## Why This Exists

`threadsmith-full-governance-speedup-v1.md` already addresses the manual-stop
problem: do not pause after every routine role handoff.

The remaining speed problem is different. A role can still be slow even when the
chain does not stop, because it may:

- read too much stale context;
- rediscover repo structure that could have been precomputed;
- repeat prior reasoning instead of consuming role-specific evidence;
- run broad verification before narrow verification is enough;
- produce output that explains the protocol more than the engineering result;
- lack measurements that tell us which role is actually expensive.

This plan is the next layer: role runtime, packet size, evidence precompute, and
quality-preserving context narrowing.

## Research and Practice Basis

The plan follows a conservative version of several public patterns:

- SWE-agent shows that agent-computer interface design affects software-agent
  performance. Threadsmith should not hand every role a generic full-context
  prompt when a role-shaped interface can do better.
  Source: https://arxiv.org/abs/2405.15793

- Claude Code subagents document the value of specialized agents with separate
  contexts that return concise summaries. Threadsmith's role packets should use
  the same idea inside the workflow: isolate noisy exploration and hand back
  structured results.
  Source: https://code.claude.com/docs/en/sub-agents

- SWE-Edit decomposes code editing into specialized stages and contexts.
  Threadsmith should similarly split "understand everything" into role-specific
  inspect, edit, review, verify, and closeout contexts.
  Source: https://www.microsoft.com/en-us/research/publication/swe-edit-rethinking-code-editing-for-efficient-swe-agent/

- Aider's repo map shows that compact structural maps help agents navigate large
  repositories under token budgets. Threadsmith should prefer repo-map and
  changed-file summaries over repeated broad scans.
  Source: https://aider.chat/docs/repomap.html

- LangGraph persistence demonstrates checkpointed state and resumable execution.
  Threadsmith should reuse durable phase/run state instead of making each role
  reconstruct prior progress from chat.
  Source: https://docs.langchain.com/oss/python/langgraph/persistence

- LLMLingua and LongLLMLingua show that compression can reduce prompt cost, but
  compression must be task-aware. Threadsmith should compress old logs and
  repeated prose first, not acceptance criteria, failed evidence, or current
  diffs.
  Sources:
  https://arxiv.org/abs/2310.05736
  https://arxiv.org/abs/2310.06839

- Lost in the Middle shows that long context can bury useful information.
  Threadsmith should place current acceptance, current slice, blockers, and
  verification evidence in stable, high-signal locations.
  Source: https://arxiv.org/abs/2307.03172

## Non-goals

- Do not remove planner, executor, reviewer, verifier, or closeout.
- Do not skip planner when the phase deliverable is planning.
- Do not make time budgets the primary mechanism.
- Do not lossy-compress current acceptance criteria, current diff, failing
  command output, destructive-operation warnings, security warnings, or
  release/merge/publish gates.
- Do not implement automatic multi-agent scheduling in this slice.
- Do not change the frozen frontend.
- Do not sync repository skill changes into the global installed skill unless
  the operator explicitly approves it later.

## Current Code Areas

- Modify: `packages/orchestrator/src/rolePackets.ts`
- Modify: `packages/orchestrator/src/packetBuilder.ts`
- Modify: `packages/orchestrator/src/phaseRunner.ts`
- Modify: `packages/runtime/src/contextPacket.ts`
- Modify: `packages/runtime/src/roleContextPacket.ts`
- Modify: `packages/runtime/src/contextBudget.ts`
- Modify: `packages/fs-bridge/src/workflow.ts`
- Modify: `codex/skills/threadsmith/SKILL.md`
- Modify: `codex/skills/threadsmith/references/action-contracts.md`
- Modify: `scripts/verify-threadsmith-skill-contract.mjs`
- Tests: `packages/orchestrator/src/rolePackets.test.ts`
- Tests: `packages/orchestrator/src/phaseRunner.test.ts`
- Tests: `packages/runtime/src/roleContextPacket.test.ts`
- Tests: `packages/runtime/src/contextBudget.test.ts`
- Tests: `packages/fs-bridge/src/workflow.test.ts`

## Implementation Progress

- Step 1 is implemented: phase runs now append local role runtime metrics to
  `.threadsmith/phase-runs/<id>/role-runtime.json`.
- Step 2 is implemented: packet generation now precomputes a reusable
  `.threadsmith/phase-runs/<id>/evidence-bundle.json` artifact when a phase run
  exists, and attaches it to role packets as a context reference.
- Step 3 is implemented at the context-reference layer: each role now gets a
  narrower set of extra state, event, phase-run, evidence, and latest-run refs
  based on its role boundary, while still keeping `current-packet` and the
  matching role packet as stable anchors.
- Step 4 is implemented: planner routing now distinguishes `planning-phase`,
  `planner-reset`, `planner-lite`, and `direct-executor`; phase runs can start
  directly at reviewer, verifier, closeout, or executor when committed truth
  clearly points there.
- Step 5 is implemented: verifier packets and phase evidence now carry
  `narrow`, `standard`, or `release` verification policy metadata with reasons,
  escalation signals, and required checks.
- Step 6 is implemented: packet-slimming regression fixtures now prove that
  executor acceptance criteria, planner-reset blocker evidence, reviewer /
  verifier upstream results, and verifier required checks survive context
  narrowing.
- Step 7 is not part of this runtime slice closeout; repository skill wording
  can be synced later if the operator approves a global/repo skill contract
  update pass.

## Design

### 1. Separate role cadence from role runtime

Cadence decides when Threadsmith stops.
Runtime decides how much work each role needs to do.

The previous speed contract mostly fixed cadence. This plan fixes runtime.

Threadsmith should keep this distinction visible in docs and code:

- `phase cadence`: planner -> executor -> reviewer -> verifier -> closeout
- `role runtime`: what each role reads, what evidence is precomputed, what it
  outputs, and how much it must rediscover

### 2. Add role-run measurement before optimization

Every role run should record a small metrics object:

- role
- phase run id
- slice id
- provider
- started at / finished at / duration
- context reference count
- role packet estimated chars / tokens
- current packet estimated chars / tokens
- output summary size
- verification command count
- failure or repair trigger, if any

This is not a product analytics system. It is local engineering telemetry stored
under `.threadsmith/phase-runs/<id>/` so we can answer: "planner was slow
because its packet was huge" versus "planner was slow because the model chose to
search too broadly".

### 3. Slim packets by role, not globally

Use role-specific packets more aggressively:

- Planner needs project purpose, current phase, scope/non-goals, next-step
  candidate, recent closeout, open questions, and decision-changing risks.
- Executor needs the approved slice, target files, constraints, existing diff,
  and implementation instructions.
- Reviewer needs changed files, claim, acceptance criteria, known risks, and
  review checklist.
- Verifier needs acceptance criteria, verification commands, latest result
  refs, failed output, and evidence checklist.
- Closeout needs final role results, verification evidence, truth writeback
  targets, residual risks, and next-phase preview.

Do not force every role to carry the same packet. The right fix is selective
routing, not one giant compressed blob.

### 4. Precompute evidence once per phase segment

Before launching a role, build a compact evidence bundle that can be reused:

- git status summary
- changed files list
- diff summary, not full diff by default
- target file hints
- latest phase-run status
- latest role result refs
- acceptance checklist snapshot
- recommended verification matrix
- stale truth warnings

Roles should consume this bundle instead of repeatedly running broad discovery.

### 5. Use safe compression boundaries

Compression is allowed for:

- old event logs;
- old closeout prose;
- repeated status explanations;
- successful command output when only pass/fail matters;
- broad repo-map prose after it has been converted into source refs.

Compression is not allowed for:

- current acceptance / done-when criteria;
- current failed command output;
- current diff evidence needed for review;
- destructive, release, credentials, or security warnings;
- unresolved user decisions;
- truth contradictions.

### 6. Make planner modes explicit

Planner should not always do the same amount of work.

Allowed modes:

- `planning-phase`: the phase deliverable is a plan, design doc, boundary
  decision, or task brief. Planner is legitimate and should stop for review when
  the plan is the deliverable.
- `planner-reset`: truth is stale, contradictory, or direction changed. Planner
  should re-anchor scope before implementation.
- `planner-lite`: direction is already approved; planner only tightens the next
  narrow slice.
- `direct-executor`: implementation slice is already approved and truth says the
  next role is executor. Planner should not repeat planning.

This preserves quality while avoiding one-size-fits-all planning.

### 7. Verification starts narrow, then escalates

Verifier should use three levels:

- `narrow`: changed-file, contract, or fixture checks that prove the slice.
- `standard`: relevant package tests plus skill/contract checks.
- `release`: full build, e2e, launchers, sync, changelog, package, and public
  surface checks.

Escalate on failure, broad impact, release-facing work, or suspicious evidence.
Do not start every slice with release-level verification.

### 8. Add quality regression fixtures

Packet slimming must not silently remove the facts that make governance useful.

Add fixtures that seed known blockers:

- acceptance criterion missing from executor packet;
- failed command output required by verifier;
- destructive action warning required by closeout;
- stale truth warning required by planner-reset;
- changed-file diff required by reviewer.

Tests should prove that each role still receives the facts it needs.

## Implementation Steps

### Step 1: Add role-run measurement

Implement a `role-runtime` artifact under the phase-run directory.

Outcome:

- every role run has duration and packet-size evidence;
- future speed claims can be checked instead of guessed.

Verification:

```bash
npm run test --workspace @threadsmith/orchestrator
npm run test --workspace @threadsmith/runtime
```

### Step 2: Add evidence precompute

Introduce a reusable evidence bundle builder in the runtime or fs-bridge layer.

Outcome:

- packet builder can reference compact evidence instead of rediscovering
  status, changed files, phase run, and acceptance every role.

Verification:

```bash
npm run test --workspace @threadsmith/runtime
npm run test --workspace @threadsmith/orchestrator
```

### Step 3: Slim role packets around explicit role needs

Refine role packet payload selection and packet text generation.

Outcome:

- planner packet is not executor packet;
- reviewer sees diff and claim;
- verifier sees evidence and commands;
- closeout sees final results and writeback targets.

Verification:

```bash
npm run test --workspace @threadsmith/runtime -- roleContextPacket
npm run test --workspace @threadsmith/orchestrator -- rolePackets
```

### Step 4: Add planner mode routing

Add explicit planner mode fields or derived decisions to packet generation and
phase-run decisions.

Outcome:

- planning phases still plan;
- approved implementation phases can go directly to executor when appropriate;
- planner-lite does narrow slice tightening without reopening the whole project.

Verification:

```bash
npm run test --workspace @threadsmith/orchestrator -- phaseRunner
npm run test --workspace @threadsmith/runtime
```

### Step 5: Add staged verification metadata

Make verification level part of the slice or role packet.

Outcome:

- verifier starts at `narrow`, `standard`, or `release` based on impact;
- failures escalate cleanly.

Verification:

```bash
npm run test --workspace @threadsmith/orchestrator
npm run verify:skill-contract
```

### Step 6: Add packet slimming regression fixtures

Add tests that prove critical evidence survives context narrowing.

Outcome:

- optimization cannot delete required context without breaking tests.

Verification:

```bash
npm run test --workspaces --if-present
```

### Step 7: Update skill contract wording

Update the Threadsmith skill and action-contract references so the operator
experience matches the runtime behavior.

Outcome:

- the skill can explain "this was slow because role context is heavy" versus
  "this stopped because closeout boundary needs review";
- the skill no longer presents runtime optimization as skipping roles.

Verification:

```bash
npm run verify:skill-contract
git diff --check
```

## Done When

- Role-run artifacts record duration and packet-size evidence.
- Planner has explicit modes and does not always perform full planning.
- Each role receives a role-shaped packet with fewer irrelevant sections.
- Evidence bundle prevents repeated broad discovery.
- Verification level is explicit and staged.
- Regression fixtures prove packet slimming keeps critical facts.
- Skill contract explains the distinction between cadence speed and runtime
  speed.
- Verification passes.

## Stop Conditions

Stop and ask the operator before continuing if implementation discovers:

- schema changes that would break existing `.threadsmith` projects without a
  migration path;
- a need to sync the global installed skill;
- a need to change the frozen frontend;
- a need to remove any role gate entirely;
- a broad redesign of phase-run storage beyond local runtime metrics.

## Expected Effect

This should improve full governance speed through:

- fewer repeated repo scans;
- smaller role prompts;
- less stale context carried into roles;
- narrower first-pass verification;
- more reusable evidence;
- clearer diagnosis of which role is slow and why.

This is not expected to make every role instant. Planning a real planning phase
can still take time. The improvement is that time should be spent on the actual
engineering decision, not on rediscovering state or dragging irrelevant context.
