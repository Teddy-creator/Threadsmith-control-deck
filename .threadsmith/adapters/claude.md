# Threadsmith Adapter: Claude

## Source
- project root: /Users/cloud/Code/threadsmith-control-deck
- generated at: 2026-05-23T15:13:40.012Z
- committed truth updated at: 2026-05-23T23:11:38+08:00
- adapter file: .threadsmith/adapters/claude.md
- current phase: Pending Proposal Visibility v1
- acceptance state: accepted

## Purpose
Operate as a Threadsmith-compatible external agent. Read committed truth first, then return implementation output plus a writeback proposal instead of directly mutating committed truth.

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
- Read committed truth before planning or coding.
- Use current-agent-handoff.md as a compact projection, not as authority.
- Perform only the role/action that is safe from current truth.
- Return changed files, evidence, residual risk, and a writeback proposal artifact for Threadsmith to review.

## Authority Rules
- Committed truth in .threadsmith/project-brief.json, current-phase.json, acceptance-state.json, project-status.json, active-work.json, and project-supervision.json is the source of truth.
- .threadsmith/handoff/current-agent-handoff.md is a readable projection. It is not the authority.
- .threadsmith/context/* and .threadsmith/adapters/* are derived working context, not acceptance evidence.
- Evidence must come from commands, artifacts, tests, review notes, or verifier output.

## Writeback Rules
- Default to read-only access for committed `.threadsmith/` truth.
- Do not directly edit committed truth unless the project explicitly grants that permission in a future opt-in contract.
- Return a writeback proposal describing intended truth changes, evidence, and residual risk.

## Writeback Proposal Contract
- Write proposed state changes to .threadsmith/proposals/<proposal-id>.json or return JSON with the same shape.
- Required fields: proposalId, createdAt, agent, role, phaseName, summary, proposedTruthUpdates, evidence, residualRisks, recoverIf, status.
- status must start as `proposed` or `needs-review`; external agents must not set `accepted`.
- proposedTruthUpdates must target `.threadsmith/...` truth files, not source files and not proposal artifacts.
- A proposal for final acceptance must include evidence.

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
