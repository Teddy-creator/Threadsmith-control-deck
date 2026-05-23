# Threadsmith Truth Boundary

## Why This Exists

Threadsmith 维护的是一组分层状态，而不是一堆等价文件。v1 的核心规则是：

- `AGENTS.md` 是项目宪法。
- `.threadsmith/*.json` 里的 committed truth 是当前项目真相。
- packet / handoff / adapter prompt 是从真相派生出来的投影。
- evidence 是证明层。
- events / action queue 是审计层。
- runs / runtime workspace 是运行产物。

这些层级的代码 contract 见 `packages/domain/src/stateBoundary.ts`。

## Plain-Language Model

可以把 Threadsmith 理解成一个项目账本：

- `committed truth`
  这些文件描述项目当前被采纳的真实状态，应该像产品代码一样被审阅、提交和回滚。
- `derived packet`
  这些文件给 agent 阅读，帮助它少读长聊天，但不能覆盖 committed truth。
- `evidence`
  这些文件或摘要说明“为什么可以相信某个验收结论”。
- `audit`
  这些事件解释状态是怎么走到现在的。
- `runtime artifact`
  这些文件是运行痕迹、临时 workspace、stdout/stderr、handoff 草稿或 smoke 中间态，不应该默认混进发布 diff。

发布前最容易出问题的，不是“有没有 truth”，而是“哪些变化真的是项目状态更新，哪些只是刚跑完一轮工具留下的噪音”。

如果这些层级互相冲突，优先级是：

1. `AGENTS.md`
2. committed truth
3. evidence
4. derived packet
5. audit / runtime artifacts
6. chat memory

## Committed Truth

当前仓库里，以下文件属于 committed truth：

- `.threadsmith/project-brief.json`
- `.threadsmith/project-status.json`
- `.threadsmith/project-roadmap.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/active-work.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-supervision.json`
- `.threadsmith/provider-routing.json`
- `.threadsmith/preferences.json`
- `.threadsmith/command-bridge.json`
- `.threadsmith/skill-routing.json`

这些文件回答的是：

- 项目目标和范围是什么
- 当前阶段和 slice 是什么
- 当前验收、协作和默认路由是什么
- 最近一次被采纳的 bridge truth 是什么

如果这些文件发生变化，默认应该把它们当成“需要判断是否提交”的产品级 truth 变更，而不是自动忽略。

## Derived Packets

以下文件是派生上下文。它们可以帮助 agent 接力，但不能当作权威状态：

- `.threadsmith/context/`
- `.threadsmith/handoff/current-agent-handoff.md`
- `.threadsmith/packets/<timestamp>-handoff.md`
- `.threadsmith/packets/<timestamp>-hygiene.md`
- `.threadsmith/adapters/*.md`

其中 `.threadsmith/handoff/current-agent-handoff.md` 是给外部或新线程 agent
读取的固定入口；`.threadsmith/packets/<timestamp>-handoff.md` 和 hygiene
packet 是历史快照。两者都必须回指 source files / generated timestamp，并且都不能覆盖 committed truth。

如果 packet 的生成时间、来源文件或当前 phase 对不上，应该回到 committed truth，或者 route to recover。

## Evidence

以下路径属于证明层：

- `.threadsmith/evidence/`
- `.threadsmith/context/evidence-summary.json`
- `.threadsmith/runs/<run-id>/result.json`
- `.threadsmith/runs/<run-id>/result.md`

Verifier 不能把缺失 evidence 当成通过。Closeout 也不能在没有 verification evidence 的情况下把状态标成 accepted。

## Audit Trail

以下路径属于审计层：

- `.threadsmith/events.ndjson`
- `.threadsmith/action-queue.ndjson`

它们解释发生过什么，但不能覆盖当前 committed truth。

## Runtime Artifacts

以下路径属于运行期产物，默认不应进入 release diff：

- `.threadsmith/runs/`
- `.threadsmith/closeouts/`
- `.threadsmith/proposals/<proposal-id>.json`
- `.threadsmith/proposal-reviews/<proposal-id>.json`
- `.threadsmith-runtime/`

这些路径主要保存：

- executor run 的 packet / prompt / stdout / result
- verification / closeout / handoff 产物
- external agent 的 writeback proposal
- Threadsmith 对 writeback proposal 的 review decision / adoption plan
- smoke 或本地实验使用的临时 workspace

这些文件可以作为证据查看，但默认不应该和 committed truth 一起审查。

## Agent Write Rules

默认规则：

- Threadsmith native workflow 可以在对应 role 的 gate 内直接写 committed truth。
- 外部已知 agent 默认可以读取 committed truth，并产出 writeback proposal。
- 外部未知 agent 默认只读 committed truth，不能直接写 `.threadsmith/*.json` 权威状态。
- Writeback proposal 只能提出建议，不能自己变成 accepted truth；采纳仍必须经过 Threadsmith role gate、evidence 和 closeout。
- Proposal review artifact 可以记录 accept-plan / reject / needs-recovery，但 accept-plan 只是待人工 gate 应用的计划，不会自动修改 committed truth。
- Derived packet 可以生成或更新，但必须标明来源文件和生成时间。
- AGENTS.md 不应被 agent 静默发明；缺失或明显不完整时应先让用户确认。

如果你需要把这套边界交给 Codex / Claude / 其他 agent 实际使用，先看
[Cross-Agent Bridge Operator Guide](../guides/cross-agent-bridge-operator-guide.md)。
那份文档给出了操作者流程、adapter 入口、proposal JSON 例子和
`accept-plan` 的人工 gate 边界。

当前 v1 bridge 已实现能力和验证地图见
[Cross-Agent Bridge Contract Closeout v1](./cross-agent-bridge-contract-closeout-v1.md)。

角色边界：

- Planner 可以更新 phase / status / active work，但不能声称 verification passed。
- Executor 可以改代码和测试，但不能自证 review / verification / acceptance。
- Reviewer 可以写 review 结论和风险，但不能自证 verification。
- Verifier 可以写 evidence 和 verification 结果，但不能顺手改实现。
- Closeout 可以写 accepted / next planned slice，但不能塞入新实现范围。
- Hygiene 可以刷新 packet / handoff，并提出 truth 修复建议。

## Release Hygiene Rule

发布前看 `.threadsmith` diff 时，先做这两个分离动作：

1. 先看 committed truth 文件有没有真的表达出“当前产品真相已经变化”。
2. 再确认 runtime artifact 是否已经被 `.gitignore` 挡住，或只作为本地证据存在。

如果一个变化只是最近跑了 smoke / verification / closeout 留下的痕迹，就不应该作为发布内容提交。

## Self-Host Smoke Default

从这轮 release-prep 开始，`npm run smoke:self-host` 的默认行为是：

- 先把当前仓库的 committed truth 快照复制到 `.threadsmith-runtime/self-host-smoke-workspace/`
- 再在这个隔离 workspace 里跑真实 executor smoke

这样做的目的，是验证真实 bridge 能否跑通，同时避免默认把主仓库的 `.threadsmith/command-bridge.json` 和其他 committed truth 再弄脏。

如果你就是想让 smoke 直接作用在某个真实项目根目录上，可以显式传入路径：

```bash
npm run smoke:self-host -- .
```

这时脚本会直接对你给出的 project root 运行，并且可能更新那个项目自己的 committed truth。

## Operator Checklist

当你看到 `.threadsmith` 有变化时，用这三个问题判断：

- 这是不是项目当前被采纳的真实状态？
- 这是不是只是一轮运行留下的中间痕迹？
- 这份变化如果进 Git，别人拉下来后会不会把它当成“当前真相”？

只有第一种情况，才默认进入提交候选。

## Recover Triggers

出现下面情况时，不要继续顺着 chat memory 往前跑，先 recover：

- `AGENTS.md` 和 `.threadsmith` 的目标、非目标或风险门冲突。
- current phase 在 handoff packet 生成后已经变化。
- acceptance claim 和 evidence 不匹配。
- agent 在没有 verification evidence 的情况下建议 accepted。
- 两个 agent 对同一个 truth object 写了不同 phase id。
- git diff 存在，但 acceptance state 写着 accepted。
- 高风险动作前无法证明 packet freshness。
