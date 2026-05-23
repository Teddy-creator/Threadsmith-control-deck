# Threadsmith Adapter: Codex

## Source
- project root: /Users/cloud/Code/threadsmith-control-deck
- generated at: 2026-05-23T14:30:24.986Z
- committed truth updated at: 2026-05-23T22:26:55+08:00
- adapter file: .threadsmith/adapters/codex.md
- current phase: Bridge Refresh Command v1
- acceptance state: accepted

## Purpose
Use `$threadsmith` as the native supervisor entry when available. Preserve sync / drive / continuous / recover mode boundaries.

## Read Order
- AGENTS.md
- .threadsmith/project-brief.json
- .threadsmith/current-phase.json
- .threadsmith/acceptance-state.json
- .threadsmith/project-status.json
- .threadsmith/active-work.json
- .threadsmith/project-supervision.json
- .threadsmith/handoff/current-agent-handoff.md

If any source file disagrees with another source file, stop and route to recover. Do not continue from chat memory alone.

## How To Operate
- `sync`: read Threadsmith truth and report status without implementation.
- `drive`: perform the next narrow role-bound move and write durable truth only at real boundaries.
- `continuous`: use the supported Threadsmith autopilot path when the user explicitly asks to keep going.
- `recover`: stop normal work when truth, git state, packet freshness, or evidence disagree.

## Authority Rules
- Committed truth in .threadsmith/project-brief.json, current-phase.json, acceptance-state.json, project-status.json, active-work.json, and project-supervision.json is the source of truth.
- .threadsmith/handoff/current-agent-handoff.md is a readable projection. It is not the authority.
- .threadsmith/context/* and .threadsmith/adapters/* are derived working context, not acceptance evidence.
- Evidence must come from commands, artifacts, tests, review notes, or verifier output.

## Writeback Rules
- Prefer `$threadsmith` for Threadsmith-managed state changes.
- Write durable `.threadsmith/` state only at real phase, verification, closeout, or handoff boundaries.
- Do not turn casual discussion into committed truth.

## Writeback Proposal Contract
- Native Codex work should normally use `$threadsmith` for committed truth writeback.
- Use a proposal only when acting as an external or delegated worker that should not directly update committed truth.

## Recover If
- AGENTS.md and .threadsmith/ disagree.
- current-agent-handoff.md is missing, stale, or references a different phase.
- this adapter was generated before committed truth updated at.
- acceptance claims passed verification but evidence is missing.
- git diff conflicts with accepted truth.
- the requested action changes scope, provider ownership, or release status.

## Output Shape
- What you read: source files and freshness notes.
- What you did: files changed or no-change.
- Evidence: commands, artifacts, or explicit missing evidence.
- Proposed Threadsmith writeback: include a writeback proposal artifact path or inline JSON proposal.
