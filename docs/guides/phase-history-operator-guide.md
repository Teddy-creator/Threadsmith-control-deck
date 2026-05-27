# Phase History Operator Guide

> Phase History is Threadsmith's project path ledger. It tells you which phases
> were accepted, what each phase produced, how it was verified, and where the
> project was expected to go next.

## 一句话说明

Phase History 不是聊天记录，也不是完整审计日志。它是一份被提交进项目的
路径账本，用来回答：

- 这个项目之前走过哪些 phase？
- 每个 phase 解决了什么？
- 当时交付了哪些东西？
- 当时怎么验证？
- 它把项目接到了哪个下一步？

如果你想恢复上下文、跨线程接力、判断现在是不是跑偏，先看 Phase History，
再看 current phase 和 acceptance state。

## 它是什么

| 对象 | 路径/命令 | 作用 |
| --- | --- | --- |
| Phase History | `.threadsmith/history/phases.jsonl` | 按行保存已记录 phase 的 durable ledger |
| Summary command | `npm run threadsmith:phase-history:summary -- <project-root>` | 用人能读的方式查看最近 phase |
| Backfill candidates | `docs/reports/artifacts/*candidates*.json` | 待审核的历史回填候选，不是 authority |
| Backfill reports | `docs/reports/artifacts/*backfill*.json` | dry-run / write 的证据 artifact |

Phase History 属于 committed project truth。它应该像 `.threadsmith/current-phase.json`
一样被审阅、提交和回滚。

## 它不是什么

Phase History 不负责：

- 记录每一次普通聊天。
- 记录每一个小 commit。
- 代替测试、review 或 verification。
- 自动判断一个功能真的实现了。
- 自动补全所有旧历史。
- 替代 `.threadsmith/current-phase.json`。

简单说：Phase History 记录“项目阶段路径”，不是记录“所有发生过的事情”。

## 日常怎么用

### 查看项目之前做过什么

```bash
npm run threadsmith:phase-history:summary -- /path/to/project --limit 8
```

你会看到：

- total phases：已经记录的 phase 数量；
- latest phase：最近一次 accepted / blocked / recovery phase；
- results：各类结果统计；
- recent phases：最近几个 phase 的名字、结果、时间和摘要；
- next phase hints：最近 phase 里提到的下一步方向。

如果你只想快速接上下文，先看最近 5 到 8 条通常就够了。

### 判断当前状态是否接得上历史

看三件事：

1. `summary` 的 latest phase 是不是你认为刚完成的那一步。
2. `.threadsmith/current-phase.json` 是不是接在 latest phase 的 next phase 后面。
3. `.threadsmith/acceptance-state.json` 的 claim 有没有证据支持。

如果这三者互相冲突，不要继续实现。先进入 sync / recover。

### 给新线程或外部 agent 交接

推荐顺序：

1. 运行 `npm run verify:project-truth`。
2. 运行 `npm run threadsmith:phase-history:summary -- . --limit 8`。
3. 运行 `npm run threadsmith:bridge-refresh -- .`。
4. 把 summary 输出、`.threadsmith/current-phase.json` 和对应 adapter prompt
   交给新 agent。

这样新 agent 先知道项目走到哪里，而不是从一段很长的聊天记录里猜。

## 什么时候写入 Phase History

只有 phase boundary 适合写入：

- 一个 phase accepted；
- 一个 phase blocked；
- 一个 phase 进入 recovery；
- 一个旧历史大节点经过审核后被 backfill；
- 一个 closeout 明确记录了 deliverables、verification 和 residual risks。

不应该写入：

- 普通聊天；
- 临时想法；
- 没有验证的实现猜测；
- 只跑了一半的 executor work；
- 没有 evidence 的“感觉完成了”。

## Backfill 规则

Backfill 是把旧的历史节点补进 ledger。它必须保守。

默认流程：

1. 生成 candidates。
2. 人工审核哪些是 milestone-level，哪些太细。
3. 先 dry-run。
4. 用户明确批准后才 `--write`。
5. 写完后再次 dry-run，确认重复候选会被跳过。

命令：

```bash
npm run threadsmith:phase-history:backfill -- /path/to/project candidates.json
```

写入命令：

```bash
npm run threadsmith:phase-history:backfill -- /path/to/project candidates.json --write
```

不要把所有旧 plan 都自动写进去。太细的 slice 会让 history 变成 commit log，
反而降低操作者理解项目路径的能力。

## 和其他 Threadsmith truth 的关系

| 文件 | 回答的问题 |
| --- | --- |
| `.threadsmith/project-brief.json` | 项目是什么、目标和边界是什么 |
| `.threadsmith/current-phase.json` | 当前正在做哪一阶段 |
| `.threadsmith/acceptance-state.json` | 当前阶段是否已经被验收 |
| `.threadsmith/project-status.json` | 当前项目总状态和下一步 |
| `.threadsmith/history/phases.jsonl` | 之前已经走过哪些阶段 |

Phase History 是“过去路径”。Current Phase 是“现在工作”。Project Status 是“当前总览”。

如果三者不一致，优先回到 committed truth 和 evidence，不要相信聊天记忆。

## 常见误解

### “history 里没有，所以这件事没发生过？”

不一定。它可能只是没有被 closeout 或 backfill 进 ledger。Phase History 是已记录路径，
不是全量事件数据库。

### “summary 显示 accepted，所以功能一定没问题？”

不一定。Accepted 表示当时 closeout 声称通过，并记录了 verification。真正判断风险时，
仍然要看 evidence、测试和当前代码。

### “backfill candidates 能直接当真相吗？”

不能。Candidates 只是候选。只有写入 `.threadsmith/history/phases.jsonl` 后，
才进入 committed project truth。

### “是不是每个 commit 都要一条 phase？”

不是。Phase 应该是操作者能理解的阶段，不是 Git 颗粒度。

## 最小操作清单

开始工作前：

```bash
npm run verify:project-truth
npm run threadsmith:phase-history:summary -- . --limit 8
```

收尾时：

- 确认 current phase / acceptance state / evidence 一致；
- closeout 后把 phase entry 写入 history；
- 再跑 summary，确认 latest phase 是刚完成的 phase。

如果 summary、current phase、acceptance state 对不上，先 recover。
