# Cross-Agent State Bridge v1 Consolidation & Gap Check

> Status: planned for execution.
> Scope: project state store / cross-agent bridge v1 documentation closeout.

## Goal

Consolidate the already-implemented project state store / cross-agent bridge
pieces into a clear v1 operator contract, then list the remaining gaps without
expanding into new implementation.

This is not a new design start. It is a consolidation and gap-check slice over
existing committed truth, merged bridge work, operator docs, proposal review,
handoff/adapters, and freshness hardening.

## Scope

- Summarize what Cross-Agent State Bridge v1 already supports.
- Map each supported capability to source files, commands, docs, and tests.
- Explain authority boundaries: `AGENTS.md`, committed truth, derived handoff,
  adapter prompts, proposals, proposal reviews, evidence, and chat memory.
- Identify v1 gaps and classify them as release blocker, follow-up, or explicit
  non-goal.
- Refresh `.threadsmith` truth so the current phase matches this consolidation
  slice.

## Out Of Scope

- No frontend maintenance or redesign.
- No automatic multi-provider execution.
- No external agent direct writes to committed truth.
- No proposal review UI.
- No release publishing.
- No global installed skill modification.
- No new runtime implementation unless verification reveals a small broken
  documentation command.

## Done When

- A v1 consolidation document exists under `docs/architecture/`.
- The document clearly separates implemented v1 capability, gaps, non-goals,
  and next slices.
- `.threadsmith` current phase / active work / status truth point at this
  consolidation slice.
- Verification confirms project truth and documentation hygiene remain valid.

## Verification

- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `git diff --check`
- `jq empty .threadsmith/*.json`

## Stop Condition

Stop after the consolidation document, gap list, and truth refresh are complete.
Do not continue into implementation of any listed follow-up gap in this slice.
