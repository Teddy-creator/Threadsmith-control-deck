# Bridge Refresh Command v1

> Status: planned for implementation.
> Scope: Cross-Agent State Bridge v1 operator command surface.

## Goal

Add one explicit command that refreshes the cross-agent bridge surface by
validating committed truth and regenerating the fixed handoff plus provider
adapter prompts.

This continues Cross-Agent State Bridge v1. It is not a new bridge design and
does not add multi-provider execution.

## Scope

- Add a `threadsmith:bridge-refresh` npm script.
- Add a CLI script that:
  - loads and validates project truth;
  - reads recent events;
  - regenerates `.threadsmith/handoff/current-agent-handoff.md`;
  - regenerates `.threadsmith/adapters/codex.md`,
    `.threadsmith/adapters/claude.md`, and
    `.threadsmith/adapters/generic-agent.md`;
  - prints a compact JSON summary for operators.
- Add focused smoke coverage proving the command writes the expected bridge
  artifacts.
- Update operator docs and the v1 architecture map.
- Refresh `.threadsmith` truth for this slice.

## Out Of Scope

- No frontend work.
- No automatic multi-provider execution.
- No external agent direct writes to committed truth.
- No proposal review UI.
- No global installed skill modification.
- No release publishing.

## Done When

- `npm run threadsmith:bridge-refresh -- .` validates truth and refreshes
  handoff + adapters in one command.
- The command output names the project root, phase, final state, handoff path,
  adapter paths, and freshness anchor.
- Smoke coverage proves the command works in an isolated project.
- Existing handoff/adapters commands still pass.
- Project truth and diff hygiene pass.

## Verification

- `npm run smoke:bridge-refresh`
- `npm run threadsmith:bridge-refresh -- .`
- `npm run threadsmith:handoff -- .`
- `npm run threadsmith:adapters -- .`
- `npm run verify:project-truth`
- `npm run verify:skill-contract`
- `git diff --check`
- `jq empty .threadsmith/*.json`

## Stop Condition

Stop after the bridge refresh command, smoke coverage, docs, and truth closeout
are accepted. Do not continue into fixture packs or pending proposal visibility
in this slice.
