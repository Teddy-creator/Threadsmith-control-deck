# Cross-Agent Bridge Operator Guide

> This guide describes the conservative v1 bridge. It is for operators and
> external agents. It does not enable automatic multi-provider execution.

## 一句话说明

Threadsmith 的跨 agent 桥不是让外部 agent 直接改项目真相，而是让外部
agent 先读同一份项目账本，完成它能完成的工作，再提交一份可审查的
writeback proposal。

Threadsmith 再负责 review 这份 proposal，决定是生成人工采纳计划、拒绝，
还是进入 recover。

## 什么时候用这条桥

适合：

- 你想让另一个 agent 看当前项目状态，而不是重新喂一大段聊天记录。
- 你想让 Claude / Codex / Cursor / 其他 agent 做某个窄角色，例如 review、
  research、verification、docs draft。
- 你希望外部 agent 能提出状态更新，但不希望它直接写 `.threadsmith/*.json`
  权威真相。
- 你需要跨线程、跨工具继续工作，并且希望新 agent 先读项目状态存储。

不适合：

- 让外部 agent 获得默认 direct write 权限。
- 把 Threadsmith 变成主聊天入口。
- 用 proposal 代替 verification。
- 把 `accept-plan` 理解成“已经自动采纳”。

## 核心对象

| 对象 | 路径 | 作用 | 权威性 |
| --- | --- | --- | --- |
| 项目宪法 | `AGENTS.md` | 项目目标、边界、风险和验证规则 | 最高 |
| committed truth | `.threadsmith/*.json` | 当前被采纳的项目状态 | 权威状态 |
| adapter prompt | `.threadsmith/adapters/*.md` | 给外部 agent 的阅读和输出规则 | 派生上下文 |
| writeback proposal | `.threadsmith/proposals/<proposal-id>.json` | 外部 agent 提出的 truth 更新建议 | 待审 artifact |
| proposal review | `.threadsmith/proposal-reviews/<proposal-id>.json` | Threadsmith 对 proposal 的审查结果 | runtime artifact |
| adoption plan | proposal review 内部字段 | 人工采纳步骤 | 计划，不是自动采纳 |

更完整的层级说明见
[Threadsmith Truth Boundary](../architecture/threadsmith-truth-boundary.md)。
v1 总览、能力地图和缺口检查见
[Cross-Agent State Bridge v1](../architecture/cross-agent-state-bridge-v1.md)。
v1 已实现能力、未承诺能力和验证命令见
[Cross-Agent Bridge Contract Closeout v1](../architecture/cross-agent-bridge-contract-closeout-v1.md)。

## 操作者流程

### 1. 准备项目状态

先确认项目已经有这些最小状态：

- `AGENTS.md`
- `.threadsmith/project-brief.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`

如果这些文件缺失、过期或互相冲突，不要委托外部 agent 继续实现。先用
`$threadsmith` 进入 sync / recover，把项目状态校准好。

### 2. 选择外部 agent 入口

给外部 agent 对应的 adapter 文件：

- Codex-like agent: `.threadsmith/adapters/codex.md`
- Claude-like agent: `.threadsmith/adapters/claude.md`
- 其他文本 agent: `.threadsmith/adapters/generic-agent.md`

adapter 文件会告诉它：

- 先读哪些 truth 文件；
- 哪些文件是 authority，哪些只是 context；
- 它基于哪一次 committed truth freshness 生成；
- 可以做什么角色动作；
- 不能直接写哪些 committed truth；
- 应该如何返回 proposal。

handoff 和 adapter 都会包含：

```text
generated at: ...
committed truth updated at: ...
```

如果 `generated at` 早于 `committed truth updated at`，说明这份派生上下文可能
已经过期。不要继续按它执行，先重新运行：

```bash
npm run threadsmith:handoff -- .
npm run threadsmith:adapters -- .
```

也可以用一条命令完成 committed truth 读取校验、handoff 刷新和 adapters 刷新：

```bash
npm run threadsmith:bridge-refresh -- .
```

这条命令只刷新派生交接面，不会执行外部 agent，也不会自动采纳 proposal。

### 3. 委托一个窄任务

委托时不要说“帮我继续整个项目”。更稳的写法是：

```text
请作为 Threadsmith-compatible external reviewer 工作。

项目根目录：/path/to/project
请先读取 AGENTS.md 和 .threadsmith committed truth。
只检查当前 phase 的实现风险，不要修改 committed truth。
如果你认为需要更新 Threadsmith 状态，请返回 writeback proposal。
```

如果是 executor，也应该限定范围：

```text
请作为 Threadsmith-compatible external executor 工作。

只处理 current phase 中 in-scope 的实现。
完成后返回 changed files、verification evidence、residual risks，
以及一份 writeback proposal。不要直接把 acceptance-state 改成 accepted。
```

### 4. 接收 proposal

外部 agent 应返回两类东西：

- 实际工作结果，例如文件变更、review note、测试命令、风险说明。
- writeback proposal，可以是文件路径，也可以是 inline JSON。

proposal 的最小字段是：

```json
{
  "proposalId": "external-review-1",
  "createdAt": "2026-05-23T09:20:00.000Z",
  "agent": {
    "id": "claude-reviewer",
    "kind": "external-known",
    "provider": "claude"
  },
  "role": "reviewer",
  "phaseName": "Bridge Documentation / Operator Guide v1",
  "summary": "Reviewed the operator guide and found no direct-write risk.",
  "proposedTruthUpdates": [
    {
      "targetPath": ".threadsmith/acceptance-state.json",
      "targetPointer": "/reviewStatus",
      "summary": "Move review status to ready-for-verification.",
      "proposedValue": "ready-for-verification"
    }
  ],
  "evidence": [
    {
      "label": "review note",
      "kind": "note",
      "reference": "external reviewer output",
      "status": "passed"
    }
  ],
  "residualRisks": ["Verification has not run yet."],
  "recoverIf": ["Committed truth changed after this proposal was generated."],
  "status": "proposed"
}
```

安全规则：

- `status` 不能直接写成 `accepted`。
- `targetPath` 必须指向 `.threadsmith/...` 项目状态文件。
- proposal 不能提出修改另一个 proposal artifact。
- 如果 proposal 想推动最终 accepted，必须带 evidence。

### 5. Threadsmith review proposal

Threadsmith 读取 proposal 后，只能做三类决定：

- `accept-plan`：生成人工采纳计划。
- `reject`：拒绝 proposal，并说明原因。
- `needs-recovery`：发现 truth 冲突、证据缺失或 phase 不一致，先 recover。

`accept-plan` 的意思是：

> 这个 proposal 看起来可以进入人工采纳步骤。

它不等于：

> committed truth 已经被自动修改。

这条边界很重要。跨 agent v1 的默认策略是让外部 agent 提案，让
Threadsmith gate 审查，再由操作者或 Threadsmith native workflow 在正确
role boundary 内写回 committed truth。

可以用命令生成 review artifact：

```bash
npm run threadsmith:review-proposal -- . <proposal-id>
```

该命令会读取 `.threadsmith/proposals/<proposal-id>.json`，并写入
`.threadsmith/proposal-reviews/<proposal-id>.json`。即使结果是
`accept-plan`，它也只会生成 manual adoption plan，不会自动修改 committed
truth。

如果 proposal 的 `createdAt` 早于当前 `project-status.json` 的 `updatedAt`，
Threadsmith 会把它判定为 stale proposal，并输出 `needs-recovery`。这表示：

- proposal 可能基于旧 committed truth；
- 不应该直接采纳；
- 操作者应先 sync / recover，然后让外部 agent 重新生成或 rebase proposal。

### 6. 人工采纳或拒绝

采纳前检查：

- proposal 是否对应当前 phase；
- proposal 是否基于最新 committed truth；
- evidence 是否存在；
- proposed truth update 是否只改应该改的状态；
- 当前 role 是否有权写这类状态；
- 是否需要 verifier 再跑命令。

如果通过，再按 adoption plan 手动应用 truth 更新，并运行验证。

如果不通过，记录 reject 或 needs-recovery，不要把 proposal 内容悄悄塞进
committed truth。

## 最小 happy path

```text
1. Operator 确认 committed truth 新鲜。
2. Operator 把 adapter prompt + 窄任务交给外部 agent。
3. 外部 agent 读取 truth，完成任务，返回 proposal。
4. Threadsmith review proposal。
5. Review 决定 accept-plan。
6. Operator / native Threadsmith gate 人工应用 truth 更新。
7. Verifier 跑证据。
8. Closeout 把 phase 标成 accepted。
```

## 常见误区

### 误区 1：有 proposal 就代表项目状态变了

不是。proposal 只是建议。项目状态只看 committed truth。

### 误区 2：accept-plan 就代表 accepted

不是。accept-plan 只是“可以人工采纳”的计划。accepted 必须经过 verification
和 closeout。

### 误区 3：外部 agent 可以直接改 `.threadsmith/*.json`

v1 默认不可以。外部 agent 默认只读 committed truth，写 proposal。

### 误区 4：adapter prompt 是最新真相

不是。adapter prompt 是派生上下文。它可以过期。冲突时回到
`AGENTS.md` 和 committed truth。

### 误区 5：这已经是 multi-provider 自动执行

不是。当前稳定边界是跨 agent 状态交接和人工 gate。真实 multi-provider
自动执行是后续独立能力。

## 验证这条桥

仓库内有 deterministic smoke：

```bash
npm run smoke:state-bridge
```

它会在隔离临时项目里验证：

- proposal artifact 可写可读；
- proposal review artifact 可写可读；
- adoption plan 使用 `manual-threadsmith-gate`；
- `accept-plan` 不会自动修改 committed truth；
- 输出包含 `committedTruthMutation: "none"`。

proposal review 命令的隔离 smoke：

```bash
npm run smoke:review-proposal
```

它会验证安全 proposal 能生成 `accept-plan` review artifact，并保持
`committedTruthMutation: "none"`。

## 和日常 Threadsmith 工作流的关系

原来的工作流不变：

```text
Project Brief -> Current Phase -> Planner -> Executor -> Reviewer -> Verifier -> Closeout
```

跨 agent bridge 只是让外部 agent 能安全进入某个角色，并通过 proposal 把结果交
回 Threadsmith。它不跳过 role gate，也不跳过 evidence。
