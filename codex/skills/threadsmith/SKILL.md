---
name: threadsmith
description: Use when the current project should be driven through the Threadsmith workflow using committed .threadsmith truth, Context Packet, and Role-specific Packets. Explicit entry only.
---

# Threadsmith

Use this skill as the explicit supervisor entry for a Threadsmith-managed project.

Threadsmith is not a generic coding prompt and it should not be invoked for every casual chat message. It is a phase-bound workflow driver that reads committed project truth, chooses the next narrow move, and writes durable state only at real task boundaries.

## Project Charter Gate

Before normal bootstrap or phase execution, find the applicable `AGENTS.md`.
Treat it as project-level constitution.
If it is missing, placeholder-only, stale, or lacks project purpose, non-goals,
architecture/risk guidance, verification expectations, or human confirmation
gates for a risky repo, stop and route to `agents-md-builder`.
Do not let AI invent these decisions silently.

## Decision State Machine

Resolve every invocation in this order. Do not skip ahead.

1. **Recover gate:** if the user reports interruption, stale state, failed
   verification, stuck run, bad handoff, unexpected drift, confusing state, or
   truth/repo disagreement, choose `recover` before any normal work.
2. **Acknowledgement gate:** if the user replies with a short approval such as
   "同意", "可以", "继续", "好", "yes", or "proceed" after Threadsmith
   recommended a concrete next step, inherit that previous mode, role, and
   action. Execute the accepted step or name the blocking gate. Do not turn the
   approval into another status refresh, re-open the same choice, or
   re-summarize the same recommendation.
3. **Project Charter Gate:** before normal bootstrap, `drive`, or `continuous`,
   evaluate AGENTS.md / project constitution status. Missing, stale,
   placeholder, declined, or contradictory charters follow the matrix in
   `references/runtime-contract.md`.
4. **Mode selection:** choose `continuous` for an explicit autopilot / keep-going
   request, `drive` for advance / implement / verify / closeout, `sync` for
   read-only status / refresh / "do not implement", and `recover` for repair.
   If unclear, prefer `sync`.
5. **Role selection:** select the next role from acceptance state and current
   phase: planner -> executor -> reviewer -> verifier -> closeout, with hygiene
   for stale, contradictory, or handoff work.
6. **Output level:** choose the smallest output shape that still orients the
   operator. Use the Output Matrix below.

If the current acceptance state is `accepted-with-closeout-pending` and the user
approves continuing, select `drive` with role `closeout` unless a blocking gate
or new user decision is discovered.

## Output Matrix

Use the full output only for `drive`, `continuous`, `recover`, bootstrap,
closeout, or any response that changes durable truth. Use compact output for
read-only `sync`. For ordinary conceptual questions about Threadsmith, answer
directly without the full contract, but still cite the relevant source layer
when making status claims.

Full output sections:

1. `Threadsmith Decision`
2. `上一步做了什么`
3. `下一步具体要做什么`
4. `当前架构位置`
5. `需要确认的点`

Compact sync output:

- 当前状态
- 当前阶段
- 验收状态
- 下一步
- 风险 / 需要确认

Conceptual answer:

- answer the question directly
- mention whether the answer comes from committed truth, skill contract, repo
  evidence, or chat memory
- do not write `.threadsmith/`

### `sync`

Use when the user asks to update status, inspect current truth, refresh the deck, or "not start implementation".

Behavior:

- read truth and context artifacts
- report project / phase / acceptance / next best step
- identify stale or missing truth
- write back only if truth is clearly stale and the correct update is durable
- do not implement code

### `drive`

Use when the user asks to advance, continue, implement, verify, close out, or run the next Threadsmith step.

Behavior:

- read truth and context artifacts
- choose the next role from the phase and acceptance state
- prefer the matching role packet when present
- perform only the next narrow move
- update `.threadsmith/` at material boundaries
- do not skip review, verification, or closeout gates

### `continuous`

Use when the user asks to keep going, reduce manual approvals, run the current phase until done, or avoid gate-by-gate prompting.

Behavior:

- prefer `npm run threadsmith:autopilot -- continue <project-root>`
- let the autopilot continuation decision resolve safely to start, resume, wait, or reset-needed
- preserve planner, executor, reviewer, verifier, repair, and closeout gates
- stop on user decisions, destructive actions, scope expansion, unavailable credentials, writeback failure, risk pauses, infrastructure pauses, or repair-loop limits
- summarize the whole chain at the end instead of pausing after every role transition

### `recover`

Use when the user reports interruption, stale state, failed verification, stuck run, bad handoff, unexpected drift, or a dead/dirty thread.

Behavior:

- stop normal execution
- compare committed truth, role packet freshness, evidence, and git state
- route to hygiene, repair, resume, or handoff
- do not continue from stale chat memory

## Required Read Order

1. Applicable `AGENTS.md` files, nearest project-specific first, then parent/root if relevant
2. `.threadsmith/preferences.json`
3. `.threadsmith/project-brief.json`
4. `.threadsmith/current-phase.json`
5. `.threadsmith/acceptance-state.json`
6. `.threadsmith/project-status.json`
7. `.threadsmith/active-work.json`
8. `.threadsmith/project-supervision.json`
9. `.threadsmith/context/current-packet.json` if present
10. `.threadsmith/context/role-packets/<role>.json` for the selected role if present
11. `.threadsmith/context/evidence-summary.json` and `.threadsmith/context/repo-map.json` if needed

If a role packet exists and is consistent with the current phase, use it as the role's working context. If it is missing or stale, fall back to the main Context Packet and committed truth, then recommend regenerating role packets later.

## Core Rules

1. Treat `.threadsmith/` committed truth as primary over chat memory.
2. Keep work narrow and phase-bound.
3. Use planner, executor, reviewer, verifier, closeout, and hygiene as distinct roles.
4. Do not allow executor to claim acceptance.
5. Do not allow reviewer to self-certify verification.
6. Do not allow verifier to turn missing evidence into a pass.
7. Do not write ordinary discussion into `.threadsmith/`.
8. If writeback fails, report the intended write, affected files, and residual risk before continuing.
9. If truth and repo state disagree, route to hygiene before new execution.
10. If the user asks for the automatic single-phase chain, prefer:
    - `npm run threadsmith:autopilot -- continue <project-root>`
    - use `start` or `resume` only when the decision is already known
11. If the user accepts the previously recommended next step, execute that step or name the blocking gate; do not restate the same recommendation as if it were new.
12. Label the source layer for any important status claim: committed truth, role packet, Context Packet, repo/evidence signal, or chat memory.
13. Keep the operator oriented: every active response must explain what just changed, what the next move changes, and which architecture layer is affected.
14. If Project Charter Gate asks for AGENTS.md and the user declines, persist or respect decline memory; do not nag again during read-only sync unless risk/scope materially changes.
15. Preserve phase continuity: before naming a next step, classify whether it is
    a new direction, continuation, consolidation, gap check, handoff, or blocked
    recovery. If the direction has already started, say "continue",
    "consolidate", or "gap-check" instead of presenting it as a new start.

## Contracts

Load references only when needed:

- Read `references/runtime-contract.md` for Project Charter Gate, truth
  authority, writeback, freshness, and AGENTS.md behavior.
- Read `references/role-contracts.md` when selecting or enforcing a role.
- Read `references/action-contracts.md` when executing an action, interpreting
  short approvals, choosing output level, or handling deck-facing actions.

## Output Contract

When using the full output, start with:

### Threadsmith Decision
- mode: `sync`, `drive`, `continuous`, or `recover`
- accepted previous recommendation: yes / no
- source layer: committed truth / role packet / Context Packet / repo evidence / chat memory
- project state
- current phase state
- acceptance state
- selected role and role packet status
- action taken now or blocking gate
- last completed step
- next best step
- active gate or stop condition

### 上一步做了什么
- 结果：一句话说明刚刚完成、阻塞、恢复或仅同步了什么
- 改了什么：列出 durable truth / code / tests / docs / no-change
- 证据：命令、文件、PR、packet、gate decision，或说明本轮是只读同步

### 下一步具体要做什么
- continuity: new / continue / consolidate / gap-check / handoff / blocked
- 目标
- 具体动作
- 架构影响或涉及对象：说明影响的是哪一层（项目 truth、role packet、Context Packet、runtime contract、action contract、tests、docs），以及为什么这层变化会影响后续流程
- 成功标准
- 停止条件

If `accepted previous recommendation` is `yes`, this section must describe the
step being executed now or the blocking gate. It must not repeat the same
recommendation as a fresh proposal.

If the next step belongs to a direction that already has committed truth,
merged PRs, accepted plans, docs, tests, or generated artifacts, do not describe
it as "start", "first write", or "begin design" unless the source evidence says
that work has not started. Use:

- `continue` when executing the next slice in the same direction
- `consolidate` when turning existing work into a stable v1 shape or closeout
- `gap-check` when comparing existing work against a definition and listing
  missing pieces
- `handoff` when packaging the state for another thread or agent
- `blocked` when a gate prevents execution

### 当前架构位置
- 项目层：当前目标、非目标、关键约束来自哪里
- 流程层：当前 phase、role、gate 在整条 workflow 中的位置
- 状态层：本轮依据的是 committed truth、role packet、Context Packet、repo evidence 还是 chat memory
- 风险层：哪些架构边界、验证边界或人工确认门正在约束下一步

### 需要确认的点
- 仅保留会改变路线、范围或验收的事项

Then perform the next narrow move unless the correct result is to stop and ask.

## Bootstrap

If `.threadsmith/` is missing or broken:

- run the explicit autopilot entry only if the user wants Threadsmith to bootstrap
- let bootstrap inspect the repository first
- continue only when bootstrap produced usable truth
- if bootstrap pauses, report missing information clearly and stop

## Notes

- Threadsmith is personal-first but role-based.
- Prefer role ownership over person ownership.
- Keep user prompts short; make the protocol do the orchestration work.
