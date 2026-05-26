# Threadsmith Full Governance Speedup v1

> Status: implemented in repository skill contract; not synced to global skill.
> Scope: make full governance faster without removing the safety guarantees that
> make it useful.

## Goal

Full governance should feel like a guided engineering workflow, not a sequence
of manual approvals after every role. This plan keeps the planner, executor,
reviewer, verifier, and closeout responsibilities intact, but reduces latency,
token waste, repeated explanation, and unnecessary operator stops.

In operator-facing terms: full governance should still protect important work,
but it should run the approved phase as one continuous chain unless a real gate
appears.

## Research and Practice Basis

This plan is grounded in several external patterns and papers:

- Microsoft Agent Governance Toolkit reports that local policy and audit checks
  can be sub-millisecond compared with LLM calls. Implication for Threadsmith:
  hot-path governance should be deterministic and local where possible, not
  another LLM judgment at every step.
  Source: https://microsoft.github.io/agent-governance-toolkit/reference/benchmarks/

- Agent Patterns' governance overview recommends explicit allow / deny /
  approval_required decisions, budgets, max steps, audit logs, and stop reasons.
  Implication for Threadsmith: full governance should use clear stop reasons and
  budgets instead of asking the operator after every ordinary transition.
  Source: https://www.agentpatterns.tech/en/governance/governance-overview

- SARC argues that runtime governance checks should be smaller than tool-call
  cost and should avoid adding another LLM call to the hot path when typed rules
  can decide. Implication for Threadsmith: use deterministic route and stop
  checks for routine gates; reserve LLM-heavy review for meaningful boundaries.
  Source: https://arxiv.org/html/2605.07728

- The Complexity Trap paper finds that observation masking can more than halve
  software-agent context cost while matching or beating LLM summarization in
  several settings. Implication for Threadsmith: reduce verbose command output,
  repeated history, and low-value observations before adding more summaries.
  Source: https://arxiv.org/abs/2508.21433

- Context as a Tool proposes a structured context workspace: stable task
  semantics, compact long-term memory, and high-fidelity recent interactions.
  Implication for Threadsmith: role packets should carry the right slice of
  current state instead of replaying the entire chat or all artifacts.
  Source: https://arxiv.org/html/2512.22087v1

- SWE-TRACE and SWE-PRM use verifier-like process feedback to prune weak or
  inefficient trajectories before too much cost is spent. Implication for
  Threadsmith: add sparse course-correction checks for loops, drift, repeated
  restatement, and missing evidence instead of full re-planning on every role.
  Sources:
  https://arxiv.org/pdf/2604.14820
  https://openreview.net/pdf/5d6145d29c2fc7a4b915c712cbac70a014a78026.pdf

- State-machine and artifact-first projects such as state_gate, Council Forge,
  Open Artisan, Donna, and AgentSpec converge on the same practice: durable
  artifacts and explicit state transitions are more reliable than hidden chat
  memory. Implication for Threadsmith: the state should decide when work can
  continue; the operator should only be interrupted for real gates.
  Sources:
  https://github.com/CAPHTECH/state_gate
  https://github.com/arcobaleno64/council-forge
  https://github.com/yehudacohen/open-artisan
  https://github.com/Tiendil/donna
  https://github.com/yimwoo/agent-spec

## Problem

Full governance can become slow for the wrong reasons:

- Routine role transitions are treated like operator approval points.
- The same recommendation is repeated instead of being executed after approval.
- Each role may receive too much context and too much historical noise.
- Verification can jump straight to broad checks instead of staged narrow checks.
- The output can spend too many tokens on protocol labels instead of explaining
  what changed, why it matters, and what comes next.
- Governance decisions are sometimes model-judgment-shaped when they should be
  rule-shaped.

These are not inherent costs of governance. They are workflow design costs.

## Design Principles

1. Full governance should pause between phases, not between routine roles.
2. The hot path should use deterministic checks before LLM-heavy judgment.
3. Each role should receive only the context it needs.
4. Keep recent execution details high fidelity; compress or mask old noisy
   observations.
5. Verify narrow first, then expand verification when risk or failure requires
   it.
6. Output should be compact during internal gates and detailed at closeout,
   blockers, recovery, and user decision points.
7. Every stop must have a named stop reason.
8. Every full-governance run should have a friction budget: maximum repeated
   restatements, maximum repair loops, and expected verification depth.

## Proposed Capability

Add a Full Governance Speed Contract to Threadsmith.

The contract should make full governance behave like this:

```text
Planner approved phase -> executor -> reviewer -> verifier -> closeout
```

The chain continues automatically unless one of these appears:

- scope expansion
- contradictory truth or stale packet
- failed verification that needs a repair choice
- destructive operation
- credentials or permission blocker
- release / merge / publish action
- user-facing product decision
- repeated failure or loop budget exceeded
- writeback failure

## Implementation Plan

### Step 1: Document the speed contract

Create this plan as the reviewed source of truth for the change.

Outcome: the intended behavior is reviewable before any skill logic changes.

### Step 2: Add a Full Governance Speed Rule to the skill

Modify `codex/skills/threadsmith/SKILL.md` so full governance has an explicit
speed rule:

- full governance is still role-complete
- approved phases run continuously through routine internal roles
- ordinary reviewer / verifier / closeout transitions are not user approval
  gates
- stop only for named real gates
- do not repeat the same next-step recommendation after the operator approves it

Outcome: the skill stops equating full governance with manual step-by-step
permission.

### Step 3: Add a deterministic stop-reason matrix

Modify `codex/skills/threadsmith/references/action-contracts.md` to define:

- `continue`
- `pause_for_operator_decision`
- `pause_for_blocker`
- `pause_for_recovery`
- `pause_for_release_action`
- `pause_for_destructive_action`
- `closeout_boundary`

Each stop reason should include what the operator needs to decide or check.

Outcome: Threadsmith can explain why it stopped without vague "next step?"
language.

### Step 4: Add context and observation budget rules

Add a rule that full governance should prefer:

- current packet over full thread replay
- role packet over all-role context
- recent high-fidelity evidence over old verbose logs
- masked or summarized command output when the exact full output is not needed
- exact full output only for failing commands, audit evidence, and user-requested
  diagnostics

Outcome: full governance reduces token drag while preserving evidence.

### Step 5: Add staged verification guidance

Define verification levels:

- `narrow`: changed-files or contract-focused checks
- `standard`: package tests plus contract checks
- `release`: full release verification, sync checks, changelog, and packaging

Full governance should start with the smallest level that matches risk and
escalate on failure, release work, or broad impact.

Outcome: full governance does not over-test small slices, but still expands
when risk requires it.

### Step 6: Add sparse course-correction checks

Add a lightweight trajectory check at phase boundaries or after repeated repair:

- are we repeating a recommendation instead of executing?
- are we drifting from the approved phase?
- did verification evidence actually prove the done-when?
- are we restating protocol labels instead of explaining operator meaning?
- did the same blocker happen twice?

Outcome: full governance catches low-efficiency loops without running a full
meta-review after every role.

### Step 7: Update contract verification

Update `scripts/verify-threadsmith-skill-contract.mjs` so it checks for:

- Full Governance Speed Rule
- deterministic stop reasons
- context / observation budget rule
- staged verification levels
- sparse course-correction checks

Outcome: future edits cannot silently remove the speed contract.

### Step 8: Verify and review

Run:

```bash
npm run verify:skill-contract
git diff --check
```

If the implementation touches installed global skill sync later, also run:

```bash
npm run verify:skill-sync
```

## Done When

- Full governance is explicitly described as continuous within an approved phase.
- Threadsmith stops only for named real gates or closeout boundaries.
- The skill distinguishes routine internal gates from operator approval gates.
- The skill has context and observation budget rules grounded in external
  research.
- The skill has staged verification guidance.
- Contract verification protects the new behavior.
- The operator-facing output explains what changed, why it matters, why the
  chain continued or stopped, and what the next phase means.

## Expected Experience Improvement

The biggest improvement should come from:

- fewer manual "continue?" pauses
- less repeated next-step text
- less full-history replay
- less verbose command-output drag
- more targeted verification
- clearer stop reasons

This should improve perceived speed and token efficiency without removing the
quality guarantees that make full governance useful.

## Non-goals

- No frontend changes.
- No automatic multi-agent scheduling.
- No release publishing.
- No schema migration unless a later implementation step proves it is necessary.
- No claim that full governance is always cheaper than fast lane.

## Operator Review Questions

Before implementation, confirm:

1. Should this speed contract apply only to `full governance`, or also to
   `fast lane + escalation guard`?
2. Should global skill sync happen in the same PR after verification, or remain
   a separate explicit operator step?
3. Should the default verification level for Threadsmith skill edits be
   `standard` or `release`?
