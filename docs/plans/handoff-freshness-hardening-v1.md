# Handoff Freshness Hardening v1

> Status: planned for implementation.
> Scope: cross-agent bridge v1 hardening.

## Goal

Make generated handoff packets and adapter prompts name the committed truth
freshness anchor they were generated from, so external agents can detect stale
working context before continuing.

## Scope

- Add a committed truth freshness line to `current-agent-handoff.md`.
- Add a committed truth freshness line to provider adapter prompts.
- Explain that generated artifacts older than committed truth must route to
  recover.
- Keep handoff/adapters as derived context, not authority.
- Add focused tests for handoff and adapter freshness text.
- Update bridge operator docs.

## Out Of Scope

- No proposal review UI.
- No frontend work.
- No multi-provider execution.
- No direct external-agent committed truth writes.
- No global skill modification.
- No release publishing.

## Done When

- Handoff output includes `committed truth updated at`.
- Adapter output includes `committed truth updated at`.
- Tests prove generated artifacts include freshness anchors and recover rules.
- Existing handoff/adapters commands still work.
- Project truth and JSON checks pass.

## Verification

- `npm run test --workspace @threadsmith/fs-bridge -- agentHandoff`
- `npm run test --workspace @threadsmith/fs-bridge -- agentAdapters`
- `npm run threadsmith:handoff -- .`
- `npm run threadsmith:adapters -- .`
- `npm run verify:project-truth`
- `git diff --check`
- `jq empty .threadsmith/*.json`

