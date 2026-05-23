# Cross-Agent State Bridge v1

> Status: consolidated v1 contract.
> Continuity: consolidate + gap-check.

## What This Is

Cross-Agent State Bridge v1 is Threadsmith's conservative bridge for sharing
project state across agents, tools, and threads without replaying a long chat
history.

It makes `.threadsmith/` the durable project state surface, lets another agent
read the same current truth, gives that agent a bounded role prompt, and asks it
to return reviewable writeback proposals instead of silently changing accepted
project state.

This is not a new product direction. It consolidates existing Threadsmith work:
project truth files, the truth boundary contract, handoff generation, adapter
prompt generation, proposal review, stale proposal recovery, and handoff /
adapter freshness anchors.

## V1 Promise

Threadsmith can act as a local project-level state store and cross-agent
handoff bridge.

In v1, an operator can:

1. Confirm the current project truth.
2. Generate a fixed handoff packet.
3. Generate provider-oriented adapter prompts.
4. Give another agent a narrow role task.
5. Ask that agent to return changed files, evidence, residual risk, and a
   writeback proposal.
6. Review the proposal through Threadsmith gates.
7. Apply accepted truth changes only through the correct role boundary.

## Implemented Capability Map

| Capability | Current status | Evidence |
| --- | --- | --- |
| Project constitution | Implemented | `AGENTS.md` defines repo-level operating rules. |
| Committed project truth | Implemented | `.threadsmith/project-brief.json`, `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`, `.threadsmith/project-status.json`, `.threadsmith/active-work.json`, `.threadsmith/project-supervision.json`. |
| Truth boundary contract | Implemented | `codex/skills/threadsmith/references/runtime-contract.md`; `docs/architecture/threadsmith-truth-boundary.md`. |
| Fixed handoff packet | Implemented | `npm run threadsmith:handoff -- .`; `.threadsmith/handoff/current-agent-handoff.md`; `packages/fs-bridge/src/agentHandoff.ts`. |
| Provider adapter prompts | Implemented | `npm run threadsmith:adapters -- .`; `.threadsmith/adapters/codex.md`, `.threadsmith/adapters/claude.md`, `.threadsmith/adapters/generic-agent.md`; `packages/fs-bridge/src/agentAdapters.ts`. |
| Read-only external agent default | Implemented | `docs/guides/cross-agent-bridge-operator-guide.md`; adapter prompt output rules. |
| Writeback proposal artifact | Implemented | `.threadsmith/proposals/<proposal-id>.json` contract in runtime/action docs and fs bridge tests. |
| Proposal review command | Implemented | `npm run threadsmith:review-proposal -- . <proposal-id>`; `scripts/threadsmith-review-proposal.ts`. |
| Pending proposal visibility | Implemented | `npm run threadsmith:proposal-status -- .`; `scripts/threadsmith-proposal-status.ts`; `npm run smoke:proposal-status`. |
| Stale proposal recovery | Implemented | proposal review rejects or routes stale proposals to recovery before adoption. |
| Handoff / adapter freshness anchors | Implemented | generated handoff/adapters include `generated at` and `committed truth updated at`. |
| Bridge refresh command | Implemented | `npm run threadsmith:bridge-refresh -- .` validates readable truth and regenerates handoff + adapters. |
| External-agent proposal fixtures | Implemented | `docs/fixtures/cross-agent-proposals/`; `npm run smoke:proposal-fixtures`. |
| Deterministic bridge smoke | Implemented | `npm run smoke:state-bridge`; `npm run smoke:review-proposal`. |
| Operator guide | Implemented | `docs/guides/cross-agent-bridge-operator-guide.md`. |

## Authority Model

Threadsmith v1 uses layered authority. Lower layers may help an agent work, but
they do not overrule higher layers.

| Layer | Examples | Authority |
| --- | --- | --- |
| Project constitution | `AGENTS.md` | Highest project-specific rules and risk gates. |
| Committed truth | `.threadsmith/*.json` | Current accepted project state. |
| Evidence | `.threadsmith/context/evidence-summary.json`, run artifacts, command output | Supports review, verification, and closeout. |
| Proposal artifacts | `.threadsmith/proposals/*.json`, `.threadsmith/proposal-reviews/*.json` | Reviewable suggestions and review results; not accepted truth by themselves. |
| Derived context | `.threadsmith/handoff/current-agent-handoff.md`, `.threadsmith/adapters/*.md`, Context Packet, Role Packets | Compact projections; useful but potentially stale. |
| Chat memory | Current conversation | Lowest authority; never the only source for status claims. |

If layers disagree, recover before continuing. Do not let an external agent
claim final acceptance without evidence and Threadsmith closeout.

## Operator Workflow

### 1. Sync Truth

Run:

```bash
npm run verify:project-truth
```

or invoke `$threadsmith` in sync / recover mode when truth looks stale.

### 2. Refresh Derived Context

Run:

```bash
npm run threadsmith:bridge-refresh -- .
```

This one command reads committed truth, refreshes the fixed handoff packet, and
refreshes all provider adapter prompts. It does not execute external agents or
apply proposals.

If you need the lower-level commands, run:

```bash
npm run threadsmith:handoff -- .
npm run threadsmith:adapters -- .
```

The generated files include:

```text
generated at: ...
committed truth updated at: ...
```

If a generated file predates the committed truth update, treat it as stale and
regenerate before delegating work.

### 3. Delegate A Narrow Role

Give the external agent:

- the relevant adapter prompt;
- the handoff file;
- the project root;
- one narrow role task;
- the instruction to return evidence and a writeback proposal.

Do not ask an external agent to "continue the whole project" without a role,
phase, and stop condition.

### 4. Review Proposal

Before reviewing a specific proposal, check the operator queue:

```bash
npm run threadsmith:proposal-status -- .
```

This reports pending, reviewed, and invalid proposal artifacts. Pending items
include the exact review command. Invalid artifacts are reported as invalid
items instead of crashing the status command.

Run:

```bash
npm run threadsmith:review-proposal -- . <proposal-id>
```

The review result can be:

- `accept-plan`: proposal can enter manual adoption;
- `reject`: proposal should not be adopted;
- `needs-recovery`: truth, phase, freshness, or evidence conflict must be
  resolved first.

`accept-plan` is not `accepted`. It does not mutate committed truth by itself.

### 5. Apply Through Native Gates

Only the correct Threadsmith role boundary should write committed truth:

- planner narrows or resets phase truth;
- executor changes source/docs/tests but does not claim final acceptance;
- reviewer records review conclusions;
- verifier records evidence;
- closeout records accepted state.

## V1 Non-Goals

These are intentionally not part of v1:

- automatic multi-provider execution;
- default direct writes to committed truth by external agents;
- proposal review UI;
- hosted state store;
- embeddings, RAG, or semantic memory;
- replacing the user's main conductor chat;
- frontend redesign;
- release publishing.

## Gap Check

| Gap | Classification | Why it matters | Suggested follow-up |
| --- | --- | --- | --- |
| Single v1 contract was scattered across several docs | Fixed by this slice | Operators need one map instead of hunting through closeout, guide, and runtime contracts. | Keep this document as the index for v1. |
| External agent fixtures were thin | Fixed by fixture pack | Sample Codex / Claude / generic proposal flows make adoption easier. | Keep `docs/fixtures/cross-agent-proposals/` aligned with proposal review behavior. |
| Proposal adoption remains manual | Explicit v1 boundary | This is safer, but users may expect `accept-plan` to apply truth automatically. | Keep manual in v1; consider opt-in adoption command later. |
| No proposal review UI | Follow-up | CLI review is enough for v1, but visual operators may miss pending proposals. | Only revisit after skill/protocol line stabilizes. |
| Pending proposal visibility was implicit | Fixed by this slice | Operators should not need to inspect `.threadsmith/proposals/` manually. | Use `npm run threadsmith:proposal-status -- .` before review/adoption. |
| No automatic multi-provider execution | Explicit non-goal | Cross-agent state bridge is a handoff and proposal bridge, not execution automation. | Treat as a separate future milestone. |
| Handoff/adapters rely on regeneration discipline | Fixed by bridge refresh command | Freshness anchors expose staleness; the refresh command gives operators one safe way to regenerate both surfaces. | Keep `threadsmith:bridge-refresh` documented as the preferred refresh entry. |
| Current `.threadsmith` truth still names the previous hardening phase until reset | Fixed by this slice | Operators should not see an accepted old phase as the current active phase. | This slice refreshes phase truth to consolidation / gap-check. |

## V1 Ready Criteria

Cross-Agent State Bridge v1 can be considered ready when:

- this contract, operator guide, and runtime contract agree;
- `npm run verify:project-truth` passes;
- `npm run threadsmith:handoff -- .` produces the fixed handoff file;
- `npm run threadsmith:adapters -- .` produces all three adapter prompts;
- `npm run threadsmith:bridge-refresh -- .` refreshes both surfaces from the
  same committed truth read;
- `npm run smoke:state-bridge` passes;
- `npm run smoke:review-proposal` passes;
- `npm run smoke:proposal-status` passes;
- `npm run smoke:proposal-fixtures` passes;
- stale handoff, stale adapter, and stale proposal behavior is documented;
- committed truth records that v1 is consolidated rather than still in
  open-ended planning.

## Recommended Next Slices

1. Proposal adoption command design: only consider after operators are comfortable
   with manual review and status visibility.

Do not combine these with this consolidation slice.
