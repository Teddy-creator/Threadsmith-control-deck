# Threadsmith Phase Narrative Output v1

> Status: accepted.
> Scope: `$threadsmith` closeout and next-phase output contract.

## Goal

Make Threadsmith phase closeout outputs explain the functional delta and next
phase clearly enough that an operator can judge direction without repeatedly
asking what changed or what the next phase will do.

## Problem

The previous full output contract was protocol-correct but too abstract:

- `上一步做了什么` often became a file/command summary instead of a functional
  explanation.
- `下一步具体要做什么` often named a direction without a planner-style brief.
- Operators still had to ask what changed, why it mattered, and what they were
  expected to approve.

## Scope

- Replace the old full output sections with a phase narrative structure:
  `本 phase 的结果`, `这一步具体做了什么`, `这一步解决的问题`,
  `验证`, `下一 phase 预览`, and `你需要审核的点`.
- Require `Before / Changed / After / Not changed` for the completed phase.
- Require next-phase preview fields: `Phase`, `continuity`, `Why now`,
  `Questions`, `Deliverables`, `Non-goals`, `Done when`, and `Stop condition`.
- Add contract verification so future edits cannot silently drop the structure.

## Out Of Scope

- No frontend UI changes.
- No automatic multi-agent scheduling.
- No runtime command behavior changes.
- No release publishing.

## Done When

- `codex/skills/threadsmith/SKILL.md` requires the new phase narrative output.
- `codex/skills/threadsmith/references/action-contracts.md` documents the
  narrative rule.
- `scripts/verify-threadsmith-skill-contract.mjs` checks the new contract.
- Repository and installed global skill are in sync.

## Verification

- `npm run verify:skill-contract`
- `npm run verify:project-truth`
- `npm run verify:skill-sync`
- `git diff --check`
