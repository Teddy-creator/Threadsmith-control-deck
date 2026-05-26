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
2. `本 phase 的结果`
3. `这一步具体做了什么`
4. `这一步解决的问题`
5. `验证`
6. `下一 phase 预览`
7. `你需要审核的点`

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

### 本 phase 的结果
- phase 名称
- result: accepted / blocked / needs-recovery / read-only sync / in-progress
- 交付物：列出 3-5 个真实产物，例如 PR、commit、docs、tests、truth、packet、command
- 结果一句话：说明系统或用户现在多了什么能力，避免只说“已更新文件”

### 这一步具体做了什么
- Before：原来缺什么、哪里让操作者困惑、系统处于什么限制
- Changed：这次新增或修改了什么对象、流程、边界、测试或文档；如果出现代码对象、命令、文件名、状态枚举、provider、role 或 runtime 名词，必须紧跟一句操作者能听懂的人话解释
- After：现在用户或系统能做什么，和之前相比有什么明确变化；先写能力变化，再写技术对象
- Not changed：哪些边界没有变，尤其是 non-goals、权限、自动化范围、未发布事项

### 这一步解决的问题
- 用户困惑：这一步让操作者少问什么问题、少踩什么坑
- 架构/流程缺口：这一步补的是项目 truth、role packet、Context Packet、runtime contract、action contract、tests、docs、UI、CLI 还是 operator workflow
- 为下一步铺路：这一步让哪个后续 phase 变得可判断或可执行

### 验证
- 已运行的命令、CI、PR、artifact 或 gate result
- 明确 pass / fail / not run
- 如果未运行某项验证，说明原因和残余风险

### 下一 phase 预览
- Phase：候选 phase 名称
- continuity: new / continue / consolidate / gap-check / handoff / blocked
- Why now：为什么现在做这一步，不做会卡在哪里
- Questions：这一 phase 要回答哪些具体问题
- Deliverables：会产出什么，不要只写“优化”或“继续推进”；每个交付物都要说明它对操作者或系统能力的意义
- Non-goals：明确不会做什么
- Done when：怎么判断完成
- Stop condition：遇到什么情况必须停下或让用户决策

### Operator Translation Rule
- Every dense technical noun must be translated once in the same section.
- Use this pattern when a term could be unclear: `技术名词：它在人话里意味着...；它位于...层；它让操作者现在能...`
- Prefer capability-first phrasing: write "现在系统能稳定补跑任务窗口" before naming `runCatchUp` or `tickRuntime`.
- Do not let filenames, enum values, command names, or internal function names be the main explanation.
- If there is no user-visible capability yet, say so explicitly and name the layer that changed, such as "这只是底层 runner，还不是 CLI、按钮或前端入口。"
- Keep `Threadsmith Decision` compact. Detailed explanation belongs in `本 phase 的结果`, `这一步具体做了什么`, and `下一 phase 预览`.

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

### 你需要审核的点
- 仅保留会改变路线、范围、non-goals 或验收标准的事项
- 用操作者能判断的语言写，例如“是否先做 UX gap check，而不是自动调度”
- 不要把已完成事实或无须决策的提醒放进这里

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
