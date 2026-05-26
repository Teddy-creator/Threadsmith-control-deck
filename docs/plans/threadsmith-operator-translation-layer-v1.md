# Threadsmith Operator Translation Layer v1

> Status: accepted.
> Scope: `$threadsmith` full-output clarity contract.

## Goal

Make Threadsmith full outputs translate implementation vocabulary into
operator-facing project understanding.

## Problem

The phase narrative structure is useful, but a real sample still felt unclear
because it explained the work with file names, function names, enum values, and
runtime terms before explaining the capability change.

## Scope

- Add an Operator Translation Rule to `SKILL.md`.
- Add the same rule to `references/action-contracts.md`.
- Require contract verification for the new translation layer.
- Keep this as an output-contract fix only.

## Out Of Scope

- No frontend changes.
- No runtime command changes.
- No automatic multi-agent scheduling.
- No release publishing.

## Done When

- Full output instructions require dense technical terms to be translated once
  in the same section.
- Explanations prefer capability-first wording before internal code names.
- Contract verification fails if the translation rule is removed.

## Verification

- `npm run verify:skill-contract`
- `npm run verify:skill-sync`
- `git diff --check`
