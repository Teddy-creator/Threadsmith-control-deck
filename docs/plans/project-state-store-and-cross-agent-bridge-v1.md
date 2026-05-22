# Project State Store and Cross-Agent Bridge v1

> Draft for review. Do not implement from this document until the product
> direction is approved.

## Goal

Define Threadsmith as a local, project-level state store and cross-agent handoff
bridge for AI coding work.

Threadsmith should keep the existing workflow supervision model intact:

```text
Project Brief -> Current Phase -> Planner -> Executor -> Reviewer -> Verifier -> Closeout
```

This slice adds a clearer shared-state layer around that workflow so Codex,
Claude, Cursor, or another agent can read the same project truth, continue from
the same phase, and hand work back without replaying long chat history.

## Plain-Language Positioning

Threadsmith is not the AI that chats with the user and it is not the AI that
writes all code. It is the project ledger beside the coding agents.

It answers:

- What is this project trying to do?
- What phase is active right now?
- What has already been accepted?
- What evidence proves or disproves the current claim?
- What should the next agent read before continuing?
- What may this agent write back, and when must it stop?

## Why This Is Needed

Cross-agent collaboration usually fails when each agent relies on a private
chat summary. Summaries are useful, but they are not precise enough to be the
authority for implementation, review, verification, and recovery.

Threadsmith should use this model instead:

- **Committed truth is the authority.**
- **Packets are compact projections of truth for agents.**
- **Events and evidence are the audit trail.**
- **Summaries are display and handoff helpers, not the source of truth.**

This matches the direction seen in stateful agent systems such as:

- checkpointed state for recoverable workflows;
- persistent memory / stores for cross-thread access;
- trajectory logs for debugging and replay;
- external protocol surfaces such as MCP for tool-accessible state.

## Non-Goals

- Do not replace Codex Desktop, Codex CLI, Claude Code, Claude CLI, or the
  user's conductor chat surface.
- Do not make Threadsmith a generic personal memory system.
- Do not automatically run Claude, Codex, or arbitrary external agents.
- Do not give every agent write permission by default.
- Do not turn summaries into authoritative state.
- Do not require a hosted backend, database, embeddings, or vector search for v1.
- Do not redesign the frontend in this slice.

## Relationship To Current Threadsmith Workflow

Existing workflow remains the core:

```text
Planner defines the slice.
Executor changes code.
Reviewer inspects implementation.
Verifier runs evidence-backed checks.
Closeout records acceptance and residual risk.
Hygiene repairs stale or contradictory truth.
```

The new state-store layer only clarifies how other agents enter and exit this
workflow.

Before work:

```text
External agent reads project state -> chooses a safe role/action -> works inside current phase
```

After meaningful work:

```text
External agent writes or proposes a state update -> Threadsmith checks evidence and gates
```

## Proposed State Layers

### 1. Project Constitution

Authority:

- `AGENTS.md`

Purpose:

- durable project purpose;
- goals and non-goals;
- architecture boundaries;
- risk rules;
- required commands;
- human confirmation gates;
- definition of done.

Rule:

- AGENTS.md constrains the project.
- It should not be silently invented by an agent.
- If it conflicts with `.threadsmith/`, route to hygiene / recover.

### 2. Committed Project Truth

Authority:

- `.threadsmith/project-brief.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`
- `.threadsmith/project-roadmap.json`

Purpose:

- current project goal;
- current phase;
- acceptance state;
- active role / blockers;
- roadmap;
- next best step;
- current supervision status.

Rule:

- This is the primary source for cross-agent continuation.
- Chat history cannot override it.
- Derived packets cannot override it.

### 3. Agent-Consumable Packets

Authority:

- derived from committed truth, not independent authority.

Current artifacts:

- `.threadsmith/context/current-packet.json`
- `.threadsmith/context/role-packets/<role>.json`
- `.threadsmith/context/repo-map.json`
- `.threadsmith/context/evidence-summary.json`

New v1 artifacts:

- `.threadsmith/handoff/current-agent-handoff.md`
- `.threadsmith/adapters/codex.md`
- `.threadsmith/adapters/claude.md`
- `.threadsmith/adapters/generic-agent.md`

Purpose:

- give another agent enough context to continue safely;
- avoid replaying long chats;
- keep role-specific input small and focused.

Rule:

- If packet freshness cannot be proven, fall back to committed truth.
- Handoff packets must name their source files and generated timestamp.

### 4. Evidence And Verification

Authority:

- `.threadsmith/context/evidence-summary.json`
- run result artifacts under `.threadsmith/runs/`
- command bridge route / result artifacts when present.

Purpose:

- record what was verified;
- record command, status, conclusion, and artifact path;
- prevent "AI said done" from becoming acceptance.

Rule:

- Verifier cannot pass missing evidence.
- Closeout cannot accept without evidence references.

### 5. Event And Audit Trail

Authority:

- `.threadsmith/events.ndjson` when present;
- `.threadsmith/action-queue.ndjson` when present;
- run status / result files.

Purpose:

- describe recent state transitions;
- support recovery;
- show who/what changed the project state.

Rule:

- Event history explains how we got here.
- It does not override current committed truth.

## Read Protocol For Any Agent

Any Threadsmith-compatible agent should read in this order:

1. Nearest applicable `AGENTS.md`.
2. `.threadsmith/project-brief.json`.
3. `.threadsmith/current-phase.json`.
4. `.threadsmith/acceptance-state.json`.
5. `.threadsmith/project-status.json`.
6. `.threadsmith/active-work.json`.
7. `.threadsmith/project-supervision.json`.
8. `.threadsmith/context/current-packet.json`, if fresh.
9. `.threadsmith/context/role-packets/<role>.json`, if role-specific and fresh.
10. `.threadsmith/context/evidence-summary.json`.
11. Recent events / runs only when needed for recovery or audit.

If these disagree, the agent should stop and route to hygiene / recover instead
of choosing the easier story.

## Write Protocol

Threadsmith v1 should define write permissions by role.

### Planner

May propose or write:

- current phase;
- project status;
- active work;
- supervision metadata.

Must not:

- claim verification passed;
- claim final acceptance;
- implement code.

### Executor

May propose or write:

- source code;
- tests;
- active work;
- implementation status moving toward review.

Must not:

- mark review passed;
- mark verification passed;
- mark final acceptance.

### Reviewer

May propose or write:

- review status;
- review findings;
- acceptance state toward ready-for-verification or review-blocked.

Must not:

- self-certify verification;
- hide residual risks.

### Verifier

May propose or write:

- evidence summary;
- verification status;
- acceptance state toward verification-failed or accepted-with-closeout-pending.

Must not:

- pass missing evidence;
- change implementation unless routed to repair.

### Closeout

May propose or write:

- final accepted state;
- residual risk;
- next planned slice;
- closeout summary.

Must not:

- add new implementation scope;
- accept without verification evidence.

### External / Unknown Agent

Default permission:

- read-only;
- may produce a writeback proposal.

May not directly write committed truth unless the project explicitly opts in.

## Handoff Packet v1

Create:

```text
.threadsmith/handoff/current-agent-handoff.md
```

Suggested structure:

```md
# Threadsmith Agent Handoff

## Source
- project root:
- generated at:
- source files:

## Project State
- project goal:
- current phase:
- acceptance state:
- active blockers:

## What Just Happened
- last completed step:
- changed files or artifacts:
- evidence:

## Next Safe Move
- recommended role:
- action:
- success criteria:
- stop condition:

## Architecture And Risk Boundaries
- relevant AGENTS.md rules:
- affected layer:
- confirmation gates:

## Writeback Rules
- this agent may write:
- this agent must only propose:
- route to recover if:
```

The handoff packet is a readable projection. It is not the authority.

## Adapter Prompt v1

Create templates for agents that do not support Codex skills directly.

### Codex Adapter

Path:

```text
.threadsmith/adapters/codex.md
```

Purpose:

- point Codex to `$threadsmith`;
- explain when to use sync, drive, continuous, recover;
- preserve current Codex-first workflow.

### Claude Adapter

Path:

```text
.threadsmith/adapters/claude.md
```

Purpose:

- let Claude Code / Claude CLI operate as a Threadsmith-compatible agent;
- instruct it to read committed truth before planning or coding;
- ask it to produce writeback proposals instead of blindly editing
  `.threadsmith/`.

### Generic Agent Adapter

Path:

```text
.threadsmith/adapters/generic-agent.md
```

Purpose:

- support any agent that can read files and follow text instructions;
- keep instructions provider-neutral.

## Conflict And Recovery Rules

Route to hygiene / recover when:

- AGENTS.md and `.threadsmith/` disagree;
- current phase changed after a handoff packet was generated;
- acceptance claim does not match evidence;
- an agent proposes final acceptance without verification evidence;
- two agents update the same truth object with different phase ids;
- git diff exists but acceptance says accepted;
- packet freshness cannot be proven for a high-risk action.

Recovery should:

- identify authoritative files;
- identify stale derived packets;
- preserve useful evidence;
- produce one next safe action.

## Summary Versus State

Threadsmith should make this distinction explicit:

- State is structured, durable, and authoritative.
- Summary is readable, compact, and derived.
- Handoff packet is a summary projection over state.
- Evidence is the proof layer.
- Events are the audit layer.

This prevents a nice-looking handoff summary from silently becoming truth.

## Minimal V1 Implementation Plan

### Slice 1: State Boundary Contract

Deliver:

- document authoritative, derived, evidence, and audit layers;
- add contract checks that verify these terms exist in docs / skill references;
- no runtime behavior change yet.

### Slice 2: Handoff Packet Generator

Deliver:

- create a deterministic runtime helper that builds
  `.threadsmith/handoff/current-agent-handoff.md`;
- include source refs and freshness data;
- add tests with stale packet scenarios.

### Slice 3: Adapter Prompt Generator

Deliver:

- generate `.threadsmith/adapters/codex.md`;
- generate `.threadsmith/adapters/claude.md`;
- generate `.threadsmith/adapters/generic-agent.md`;
- keep them text-only and provider-safe.

### Slice 4: Writeback Proposal Contract

Deliver:

- define a markdown or JSON proposal format for external agents;
- distinguish direct writes from proposed writes;
- add validation / conflict detection.

### Slice 5: Recovery Integration

Deliver:

- route stale handoff / conflicting truth into existing hygiene / recover;
- update `$threadsmith` skill contract to mention cross-agent bridge behavior.

## Acceptance Criteria

This design is ready for implementation when:

- existing Threadsmith workflow remains unchanged;
- Codex-first `$threadsmith` remains the native path;
- Claude and generic agents have a clear read-only entry path;
- external agents can hand back writeback proposals safely;
- summaries are clearly non-authoritative;
- stale or conflicting handoffs route to recover;
- no frontend redesign is required for v1.

## Open Questions

- Should external agents ever be allowed direct write permission in v1, or only
  writeback proposals?
- Should handoff packets be regenerated on every `$threadsmith sync`, or only
  when explicitly requested?
- Should adapter prompts live under `.threadsmith/adapters/` or under
  repository docs?
- Should the control deck show handoff freshness in v1, or defer UI changes?
- Should project-level preferences define trusted agent ids?

## Recommended Decision

Proceed with this direction, but keep v1 conservative:

- keep Threadsmith local-first and file-based;
- preserve current workflow;
- make handoff packets and adapter prompts readable and deterministic;
- default external agents to read-only plus writeback proposals;
- defer automatic multi-provider execution.
