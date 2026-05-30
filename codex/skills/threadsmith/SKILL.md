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
Evaluate it using the matrix in `references/runtime-contract.md`. Do not invent
project purpose, non-goals, architecture boundaries, verification expectations,
or human confirmation gates silently.

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
4. **Mode selection:** use the Execution Cadence Selector below. If unclear,
   prefer `sync`.
5. **Role selection / chain:** select the next required role from acceptance
   state and current phase, then decide whether it belongs to the
   already-approved phase chain: planner -> executor -> reviewer -> verifier ->
   closeout, with hygiene for stale, contradictory, or handoff work.
6. **Output level:** choose the smallest output shape that still orients the
   operator. Use the Output Matrix below.

If the current acceptance state is `accepted-with-closeout-pending` and the user
approves continuing, select `drive` with role `closeout` unless a blocking gate
or new user decision is discovered.

## Phase Execution Cadence

Default rhythm: pause between phases, not between roles.

When the user has approved the current phase plan or accepts a concrete
Threadsmith recommendation, `drive` should continue the internal role chain
until closeout or a real stop condition. The normal chain is:

```text
planner approval -> executor -> reviewer -> verifier -> closeout -> stop for next phase review
```

Do not ask the operator to approve routine transitions such as executor ->
reviewer, reviewer -> verifier, or verifier -> closeout. Those are internal
gates inside the same phase, not new phases.

Stop mid-chain only when a real gate appears:

- scope, non-goals, or acceptance criteria would change
- reviewer finds a blocker or scope drift
- verifier fails or evidence is missing
- destructive git, publishing, unavailable credentials, or external services
  are required
- truth, role packet, or repo evidence contradicts the selected action
- writeback fails or recovery is required

`下一 phase 预览` belongs at closeout or phase-boundary reporting. During an
internal role handoff, say which role/gate will run next, but do not present it
as something the operator must approve.

## Adaptive Work Session Mode

A work session is a bounded group of related actions inside the current phase.
It is larger than a single role gate and smaller than a new phase. It does not
replace the phase contract, and it must not silently expand scope.

Use a work session when all are true:

- the operator has accepted the current direction
- the next 2-4 actions affect the same subsystem and accepted goal
- no unapproved user-visible capability, consumer surface, product semantics
  change, provider default, credential, release, or destructive action appears
- verification can stay `narrow` or `standard`
- durable truth can be written at the work-session boundary without losing
  auditability

Do not use a work session when the next action changes product semantics,
exposes a new consumer surface, changes provider / credential / release /
destructive behavior, contradicts committed truth, or follows a failed
verification whose repair path is uncertain.

Examples:

- related work session: extract a module, add focused tests, update the direct
  existing consumer, and close out once
- single-role drive: the user asks specifically for reviewer only, verifier
  only, or "do not implement"
- stop-gate fallback: adding a CLI command, API endpoint, UI route, provider
  default, public sync, tag, publish, migration, delete, or reset must pause for
  operator review

### Work-Session Truth Writeback

At work-session start, do not create a new phase only to name the session. Record
the work-session target in active work or the current packet only if it changes
execution behavior or prevents repeated recommendations.

During the session, keep internal notes as run evidence, command output, or
local reasoning unless a real stop gate appears. Write durable truth immediately
only for blockers, failed verification, scope changes, or user decisions.

At work-session closeout, update acceptance state when done-when evidence
changed, active work when role / blocker / next action changed, evidence summary
or current packet when the next operator turn needs the fact, and role packets
when role-relevant truth changed. Do not preserve every internal sub-step as
active truth when the final result already captures it.

## Human-Centered Governance Modes

Threadsmith should keep protocol strict internally but make ordinary
operator-facing work feel like low-friction collaboration.

Use these operating modes:

- `light-repair`: one-surface fixes, copy edits, focused test expectation
  updates backed by accepted behavior, and local cleanup that does not claim
  durable phase acceptance. Prefer focused verification and evidence-only
  reporting.
- `normal-implementation`: ordinary bounded implementation, related multi-file
  work sessions, focused refactors, and behavior covered by existing acceptance.
  Prefer short closeout and current-context writeback.
- `full-governance`: architecture boundaries, release / PR / merge,
  cross-agent state, provider routing, destructive actions, credentials, new or
  changed public behavior with unclear semantics / compatibility risk / release
  impact / product safety risk, stale truth, or contradictory evidence.

Selection rules:

- uncertain `light-repair` vs `normal-implementation`: choose
  `normal-implementation`
- uncertain `normal-implementation` vs `full-governance`: choose
  `full-governance` only when a real stop gate exists; otherwise stay in
  `normal-implementation` and name the residual risk
- missing legacy mode / tier fields: use `normal-implementation` only when safe;
  otherwise fall back to `full-governance` and explain the missing signal

### Truth Writeback Tiers

Choose the smallest writeback tier that preserves safety:

- `evidence-only`: no committed truth state changes. Evidence may live in the
  final response, command output, local run artifact, or explicitly configured
  runtime evidence artifact. Do not mutate project state files. Prefer ignored
  or temporary paths for local artifacts; if ignored status is unknown, label
  it as an `untracked artifact risk`.
- `current-context`: update current packet, active work, or evidence summary
  only because the next operator turn needs that fact.
- `committed-truth`: update phase, acceptance, status, supervision, role
  packets, handoff, proposal review, or phase history because durable project
  state changed.

Writeback file allowlist:

- `evidence-only`: default to 0 `.threadsmith` state-file writes. Use final
  response, command output, test output, or ignored/temp local artifact.
- `current-context`: may update only next-turn context/evidence such as
  `.threadsmith/context/current-packet.json`,
  `.threadsmith/context/evidence-summary.json`, or `.threadsmith/active-work.json`
  when that fact affects the next action.
- `committed-truth`: may update durable files such as
  `.threadsmith/current-phase.json`, `.threadsmith/acceptance-state.json`,
  `.threadsmith/project-status.json`, project brief/roadmap/supervision, role
  packets, handoff/routing files, or `.threadsmith/history/phases.jsonl` only
  when those surfaces actually changed.

Do not create optional context files solely to satisfy a tier, and do not rewrite
role packets when they only restate current packet facts.

Runtime recommendations should include surface metadata when determinable:

- `surfaceAudience`: `internal`, `developer`, `operator`, or `user_public`
- `workVisibility`: `internal`, `developer_visible`, `operator_visible`, or
  `user_visible`

`operator` surfaces may continue inside an approved scope when local,
reversible, and not changing long-term workflow semantics. Upgrade them to
`full-governance` when they create a long-lived operator/public entry point,
alter defaults, affect compatibility, or could be mistaken for public behavior.

Short approvals such as "同意" do not create committed truth by themselves.
They execute the accepted step unless they also change scope, product direction,
architecture, acceptance, or durable route.

## Execution Cadence Selector

Choose execution cadence by state, not only by wording:

- `sync`: read-only status, refresh, explanation, or "do not implement".
- `drive`: one bounded role/action, one explicit verification request, or a
  phase-chain step that cannot safely use autopilot.
- `continuous`: an approved phase can run through executor -> reviewer ->
  verifier -> closeout without a real stop gate. This includes explicit
  "keep going" requests and short approvals after Threadsmith recommended a
  concrete phase-chain step.
- `recover`: interruption, stale truth, failed verification, stuck run, bad
  handoff, contradictory truth, or confusing state.

When `continuous` is selected, prefer:

```text
npm run threadsmith:autopilot -- continue <project-root>
```

Use `drive` instead of `continuous` only when the user asked for a single role,
the phase is not approved, autopilot is unavailable, or a stop reason applies.

## Full Governance Speed Contract

Full governance keeps all role gates, but it must not turn every role handoff
into an operator stop. Once a phase plan is approved, optimize for one
continuous, evidence-backed phase run.

Hot-path governance should be rule-shaped before it is model-judgment-shaped:
use deterministic stop reasons, verification levels, role-scoped context, and
friction budgets before asking the operator or launching another broad review.

Named stop reasons:

- `continue`: no real gate; proceed through the current approved role chain
- `pause_for_operator_decision`: scope, non-goals, acceptance, or product
  direction would change
- `pause_for_blocker`: reviewer, verifier, repo, or dependency evidence blocks
  progress
- `pause_for_recovery`: truth, role packet, Context Packet, evidence, or git
  state is stale or contradictory
- `pause_for_release_action`: merge, publish, tag, public sync, or external
  release action is required
- `pause_for_destructive_action`: destructive git, file, data, credential, or
  irreversible environment action is required
- `closeout_boundary`: the approved phase completed and the next phase needs
  operator review

Context and observation budget:

- prefer current packet over full thread replay
- prefer the selected role packet over all-role context
- keep recent failing evidence high fidelity
- mask, trim, or summarize old verbose command output when exact output is not
  needed for audit or diagnosis
- keep exact full output for failures, user-requested diagnostics, and evidence
  that proves or disproves acceptance

Verification levels:

- `narrow`: changed-file, contract, or focused evidence checks
- `standard`: package tests plus relevant contract checks
- `release`: full release, launcher, sync, changelog, package, and public
  surface checks

Start with the smallest verification level that matches the risk, then escalate
on failure, broad impact, release-facing work, or contradictory evidence.

Sparse course-correction checks run at phase boundaries, after repeated repair,
or when output starts to loop. Check whether Threadsmith is repeating a
recommendation instead of executing, drifting from the approved phase, missing
done-when evidence, overusing protocol labels, or hitting the same blocker
twice. This is a lightweight trajectory check, not a full re-plan after every
role.

## Gap Check Budget

Gap checks prevent wrong work; they must not become action prelude loops. A work
session gets one gap check by default.

After a gap check selects an implementation path, the next normal action should
be implementation, not another gap check, unless verification failed, scope or
product direction changed, release / destructive / public risk appeared,
provider routing changed, or committed truth contradicts repo evidence.

## Product / User-Value Heartbeat

After three consecutive governance-heavy accepted sessions without a heartbeat,
recommend a lightweight value check at the next phase boundary or work-session
closeout. Governance-heavy means `standard` or `audit` closeout; `lite` does not
increment the counter.

The heartbeat asks whether the project became more usable, understandable,
reliable, playable, or closer to its stated goal; whether the next local
engineering step is still highest value; and whether the operator should choose
between engineering depth, product surface, architecture map, or UX / creative
validation.

The heartbeat is advisory. It must not rewrite acceptance, force a direction
change, or interrupt an accepted implementation path unless a real stop gate
appears.

Definitions:

- governance-heavy means `full-governance` or a closeout that updates committed
  truth across acceptance, phase, provider, release, or cross-agent state
- internal-only means the work changed internal structure, tests, docs, or state
  machinery without creating a user-visible or operator-visible capability

## Output Matrix

Use the smallest closeout tier that still preserves orientation and safety:

- `lite`: small or low-risk work. Required fields: changed, verification, truth
  (`updated`, `unchanged`, or `skipped with reason`), next, and optional risk.
- `standard`: normal bounded implementation. Required fields: result, changed
  capability, verification, truth, remaining risk, and next phase.
- `audit`: release, PR / merge, public docs, destructive operations,
  architecture boundaries, provider routing, security, or cross-agent state. Use
  the full Threadsmith Output Contract skeleton.

Use boundary full output for `recover`, bootstrap, audit closeout, accepted
phases, phase-boundary reports, and any response that changes durable truth in a
way that affects route, scope, acceptance, release, or cross-agent state.

## Closeout Output Gate

Before writing the final response, check whether the current action crossed a
phase or slice boundary. If any two of these signals are present, the response
is a closeout or phase-boundary report and must use boundary full output:

- the work is described as completed, accepted, closed out, or ready for the
  next phase
- a commit, PR, merge, tag, release, durable truth writeback, packet update, or
  closeout artifact was created
- verification passed or acceptance evidence is listed
- the response introduces the next phase, next slice, or next recommended
  direction

When this gate triggers, do not collapse the response into a prose summary such
as "已用 Threadsmith 推进并完成...", "这一步做的是...", "验证已通过...",
and "下一步建议...". Those sentences may appear inside the required full
output fields, but they cannot replace the skeleton.

Threadsmith output rules override the default concise Codex final style for
closeout and phase-boundary reports.

Use internal progress output for routine role-chain handoffs inside an approved
phase, such as executor -> reviewer, reviewer -> verifier, or verifier ->
closeout.

Output budgets:

- `light-repair`: 3-5 concise lines by default: changed, verification, material
  risk, and next if any
- `normal-implementation`: short closeout with capability, verification,
  writeback tier, and next concrete action
- `full-governance`: full audit skeleton only when a real audit boundary exists

Use compact output for read-only `sync`. For ordinary conceptual questions about
Threadsmith, answer directly without the full contract, but still cite the
relevant source layer when making status claims.

Full output must use the exact field skeleton in `Output Contract`. Do not
satisfy full output by writing only these section headings with free-form
paragraphs underneath.

Full output sections, each with required child fields. Use human-first order:

1. `一句话结论`
2. `本 phase 的结果`
3. `这一步具体做了什么`
4. `这一步解决的问题`
5. `验证`
6. `下一 phase 预览`
7. `你需要审核的点`
8. `Threadsmith Decision`

Internal progress output:

- 已完成内部 gate
- 下一内部 gate
- 当前 stop reason: `continue` or named pause reason
- 证据/风险: only what changed the execution decision

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
- choose the next role-chain segment from the phase and acceptance state
- prefer the matching role packet when present
- after phase approval, run executor -> reviewer -> verifier -> closeout as one
  internal chain unless a stop condition appears
- update `.threadsmith/` at material boundaries
- do not skip review, verification, or closeout gates
- stop after closeout with a next-phase preview instead of asking for approval
  between internal roles

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

## Mode-Specific Read Sets

Read only what the selected mode needs, unless a contradiction forces recovery.

`sync`:

1. Applicable `AGENTS.md` files, nearest project-specific first
2. `.threadsmith/preferences.json`
3. committed truth: project brief, current phase, acceptance state, project status, active work, supervision
4. `.threadsmith/context/current-packet.json` if present

`drive`:

1. `sync` read set
2. `.threadsmith/context/role-packets/<role>.json` for the selected role if present
3. `.threadsmith/context/evidence-summary.json`
4. recent git/repo evidence needed for that role

`continuous`:

1. `drive` read set
2. current phase-run state if present
3. autopilot continuation decision

`recover`:

1. full committed truth
2. matching and main Context Packets
3. all relevant role packets
4. evidence summary, repo map, recent diff, phase runs, proposals, and writeback failures

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
16. Do not stop merely because the next internal role is reviewer, verifier, or
    closeout. Stop for phase boundaries and real gates; otherwise continue the
    role chain.
17. In full-governance work, apply the Full Governance Speed Contract: named
    stop reasons, role-scoped context, staged verification, and sparse
    course-correction before adding operator pauses or broad LLM review.

## Contracts

Load references only when needed:

- Read `references/runtime-contract.md` for Project Charter Gate, truth
  authority, writeback, freshness, and AGENTS.md behavior.
- Read `references/role-contracts.md` when selecting or enforcing a role.
- Read `references/action-contracts.md` when executing an action, interpreting
  short approvals, choosing output level, or handling deck-facing actions.
- Read `references/external-agent-entry.md` when handing work to another agent,
  reading another agent's proposal, or explaining cross-agent state boundaries.

## Output Contract

When using the full output, render this exact skeleton. Keep answers concise,
but do not omit required labels. If a field has no content, write `none` or
`not run` with the reason.

### 一句话结论
- 先用 1-2 句中文说明：这一步到底让项目多了什么能力、现在停在哪里、下一步要用户审核什么。不要从 protocol field 开场。

### 本 phase 的结果
- phase 名称:
- result: accepted / blocked / needs-recovery / read-only sync / in-progress
- 交付物: 3-5 个真实产物，例如 PR、commit、docs、tests、truth、packet、command
- 结果一句话: 说明系统或用户现在多了什么能力，避免只说“已更新文件”
- 架构影响: affected layer + concrete object + why that layer matters

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
- 已运行:
- 结果: pass / fail / not run
- 未运行与风险:

### 下一 phase 预览
- Phase：候选 phase 名称
- continuity: new / continue / consolidate / gap-check / handoff / blocked
- Why now：为什么现在做这一步，不做会卡在哪里；必须说明它接的是上一 phase 的哪个结果
- Questions：这一 phase 要回答哪些具体问题；不要只写“继续检查”
- Deliverables：会产出什么，不要只写“优化”或“继续推进”；每个交付物都要说明它对操作者或系统能力的意义
- Non-goals：明确不会做什么
- Done when：怎么判断完成
- Stop condition：遇到什么情况必须停下或让用户决策

If there are multiple options, pick one recommendation first and explain the
tradeoff in the same fields. Do not output only `Option A` / `Option B` bullets
without `Why now`, `Deliverables`, and `Done when`.

### Threadsmith Decision
- mode: `sync`, `drive`, `continuous`, or `recover`
- source layer: committed truth / role packet / Context Packet / repo evidence / chat memory
- role-chain status: internal continuing / stopped at closeout / blocked
- active gate or stop condition:

Keep this section last and compact. Do not include long project summaries,
full role lists, last-step details, or next-step explanations here. Put those
in the human-facing sections above.

Only use this section for a real next phase or phase-boundary closeout. If the
next action is merely reviewer, verifier, or closeout inside the current phase,
describe it as `下一内部 gate` in the current section and continue unless a
stop condition applies.

### Operator Translation Rule
- Every dense technical noun must be translated once in the same section.
- Use this pattern when a term could be unclear: `技术名词：它在人话里意味着...；它位于...层；它让操作者现在能...`
- Prefer capability-first phrasing: write "现在系统能稳定补跑任务窗口" before naming `runCatchUp` or `tickRuntime`.
- Do not let filenames, enum values, command names, or internal function names be the main explanation.
- Avoid foregrounding dense protocol terms such as `phase`, `role`, `packet`,
  `truth`, `closeout`, `surface`, and `boundary` without plain-language
  translation in ordinary answers.
- Every next step and closeout must include capability translation: name the
  technical object and the project capability it enables.
- If there is no user-visible capability yet, say so explicitly and name the layer that changed, such as "这只是底层 runner，还不是 CLI、按钮或前端入口。"
- Keep `Threadsmith Decision` compact and at the end. Detailed explanation belongs in `一句话结论`, `本 phase 的结果`, `这一步具体做了什么`, and `下一 phase 预览`.

Explanation style preference:

- `operatorExplanationStyle`: `concise`, `balanced`, `teaching`, or `detailed`
- source priority: project preferences, AGENTS.md, project brief/supervision,
  then Threadsmith default `balanced`
- this changes explanation depth only; it must not change safety gates,
  verification level, or writeback tier

Timestamp and command comfort:

- durable truth timestamps use new-write-only UTC ISO 8601 with milliseconds
  (`YYYY-MM-DDTHH:mm:ss.SSSZ`). Do not bulk-rewrite legacy timestamps solely for
  normalization.
- before recommending repo commands such as
  `npm run threadsmith:autopilot -- continue <project-root>`, verify the command
  exists in the target repo, then Threadsmith control deck, then global command
  lookup. If availability cannot be safely checked, provide the manual
  equivalent instead of presenting the command as executable.

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

Then continue the approved phase's role chain unless the correct result is to
stop at closeout or a real gate.

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
