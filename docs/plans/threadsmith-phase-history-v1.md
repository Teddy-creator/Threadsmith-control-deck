# Threadsmith Phase History v1

## Goal

Give Threadsmith a durable project path log so an operator can answer: "what
phases did this project already complete, what did each one produce, how was it
verified, and what did it lead to?"

## Scope

- Add a domain schema for phase history entries.
- Store history as append-only JSONL at `.threadsmith/history/phases.jsonl`.
- Add fs-bridge helpers to append and read phase history.
- Keep the first slice backend/file-contract only; do not change the frontend.

## Out of scope

- Rendering a timeline in the deck UI.
- Reconstructing all old project history automatically.
- Replacing phase run records. Phase runs describe automation runtime; phase
  history describes durable project path.
- Multi-agent automatic scheduling.

## Done when

- The domain package validates a phase history entry.
- The fs bridge can append entries and read them newest-first or oldest-first.
- Empty or missing history reads as an empty list.
- Tests cover append/read ordering and validation.

## Verification

- `npm run test --workspace @threadsmith/domain`
- `npm run test --workspace @threadsmith/fs-bridge`
- `npm run verify:project-truth`
- `git diff --check`
